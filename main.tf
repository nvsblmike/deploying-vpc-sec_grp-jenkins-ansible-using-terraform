# main.tf
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# AWS Provider Configuration
provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Environment   = "Production"
      Terraform     = "true"
      Project       = "CI/CD Pipeline"
      CostCenter    = "DevOps"
    }
  }
}

# VPC Configuration
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.0.0"

  name = "jenkins-vpc"
  cidr = "10.0.0.0/16"

  azs              = ["${var.aws_region}a", "${var.aws_region}b"]
  public_subnets   = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnets  = ["10.0.101.0/24", "10.0.102.0/24"]
  database_subnets = ["10.0.201.0/24", "10.0.202.0/24"]

  enable_nat_gateway     = true
  single_nat_gateway     = false
  one_nat_gateway_per_az = true

  public_subnet_tags = {
    "NetworkTier" = "Public"
  }

  private_subnet_tags = {
    "NetworkTier" = "Private"
  }
}

# Security Groups
resource "aws_security_group" "ansible_sg" {
  name        = "ansible-controller-sg"
  description = "Ansible Controller security group"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description = "SSH from trusted IPs"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Role = "Ansible-Controller"
  }
}

resource "aws_security_group" "jenkins_master_sg" {
  name        = "jenkins-master-sg"
  description = "Jenkins Master security group"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description     = "SSH from Ansible Controller"
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = [aws_security_group.ansible_sg.id]
  }

  ingress {
    description = "Jenkins Web Interface"
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "JNLP Agent Communication"
    from_port   = 50000
    to_port     = 50000
    protocol    = "tcp"
    cidr_blocks = [module.vpc.vpc_cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Role = "Jenkins-Master"
  }
}

resource "aws_security_group" "jenkins_agent_sg" {
  name        = "jenkins-agent-sg"
  description = "Jenkins Agent security group"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description     = "SSH from Controller & Master"
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Agent Communication"
    from_port   = 50000
    to_port     = 50000
    protocol    = "tcp"
    cidr_blocks = [module.vpc.vpc_cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Role = "Jenkins-Agent"
  }
}

# SSH Key Management
resource "tls_private_key" "ssh_key" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "generated_key" {
  key_name   = "jenkins-ci-cd-key-${var.environment}"
  public_key = tls_private_key.ssh_key.public_key_openssh
}

resource "local_file" "private_key" {
  content  = tls_private_key.ssh_key.private_key_pem
  filename = "${path.module}/.ssh/jenkins_ci_cd.pem"
  file_permission = "0600"
}

# IAM Roles
resource "aws_iam_instance_profile" "jenkins_master" {
  name = "jenkins-master-profile"
  role = aws_iam_role.jenkins_master.name
}

resource "aws_iam_role" "jenkins_master" {
  name = "jenkins-master-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })

  managed_policy_arns = [
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
    "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
  ]
}

# EC2 Instances
resource "aws_instance" "ansible_controller" {
  ami                    = data.aws_ami.ubuntu.id 
  instance_type          = "t2.micro"
  subnet_id              = module.vpc.public_subnets[0]
  vpc_security_group_ids = [aws_security_group.ansible_sg.id]
  key_name               = aws_key_pair.generated_key.key_name
  monitoring             = true
  associate_public_ip_address = true  # Explicitly enable public IP

  user_data = templatefile("${path.module}/ansible-controller-setup.sh.tpl", {
    private_key_content = tls_private_key.ssh_key.private_key_pem
    ansible_user        = "ubuntu"
    SSH_DIR             = "/home/ubuntu/.ssh"  # <-- Add this line
  })

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
  }

  tags = {
    Name = "Ansible-Controller"
  }
}

resource "aws_instance" "jenkins_master" {
  ami                    = data.aws_ami.ubuntu.id 
  instance_type          = "t3.micro"
  subnet_id              = module.vpc.public_subnets[0]
  vpc_security_group_ids = [aws_security_group.jenkins_master_sg.id]
  key_name               = aws_key_pair.generated_key.key_name
  iam_instance_profile   = aws_iam_instance_profile.jenkins_master.name
  monitoring             = true
  associate_public_ip_address = true

#   user_data = <<-EOT
#     #!/bin/bash
#     sudo apt-get update -y
#     sudo apt-get install -y openjdk-17-jdk
#     curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | sudo tee \
#         /usr/share/keyrings/jenkins-keyring.asc > /dev/null
#     echo deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] \
#         https://pkg.jenkins.io/debian-stable binary/ | sudo tee \
#         /etc/apt/sources.list.d/jenkins.list > /dev/null
#     sudo apt-get update
#     sudo apt-get install -y jenkins
#     sudo systemctl enable jenkins
#     sudo systemctl start jenkins

#     # Docker installation
#     sudo apt-get install -y ca-certificates curl
#     sudo install -m 0755 -d /etc/apt/keyrings
#     sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
#     sudo chmod a+r /etc/apt/keyrings/docker.asc
#     echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
#         https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
#         sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
#     sudo apt-get update
#     sudo apt-get install -y docker-ce docker-ce-cli containerd.io
#     sudo usermod -aG docker jenkins
#   EOT


  root_block_device {
    volume_size = 50
    volume_type = "gp3"
  }

  tags = {
    Name = "Jenkins-Master"
  }
}

resource "aws_instance" "jenkins_agent" {
  count         = 2
  ami           = data.aws_ami.ubuntu.id 
  instance_type = "t2.micro"
  subnet_id     = module.vpc.public_subnets[0]
  vpc_security_group_ids = [aws_security_group.jenkins_agent_sg.id]
  key_name               = aws_key_pair.generated_key.key_name
  associate_public_ip_address = true

#   user_data = <<-EOT
#     #!/bin/bash
#     # Update package lists
#     sudo apt-get update -y

#     # Install OpenJDK 11
#     sudo apt-get install -y openjdk-11-jdk

#     # Install Docker dependencies
#     sudo apt-get install -y \
#         apt-transport-https \
#         ca-certificates \
#         curl \
#         software-properties-common

#     # Add Docker's official GPG key
#     curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

#     # Add Docker repository
#     echo \
#     "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu \
#     $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

#     # Install Docker Engine
#     sudo apt-get update -y
#     sudo apt-get install -y docker-ce docker-ce-cli containerd.io

#     # Manage Docker service
#     sudo systemctl enable docker
#     sudo systemctl start docker

#     # Configure user permissions
#     sudo usermod -aG docker ubuntu

#     # Optional: Verify installations
#     java -version
#     docker --version
#   EOT

  tags = {
    Name = "Jenkins-Agent-${count.index + 1}"
  }

  lifecycle {
    ignore_changes = [ami]
  }
}

# Supporting Data Sources
# Replace Amazon Linux AMI data source with Ubuntu
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["amazon"] # Canonical's AWS account ID

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}
