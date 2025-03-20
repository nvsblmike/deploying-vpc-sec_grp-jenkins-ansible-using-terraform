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
#   database_subnets = ["10.0.201.0/24", "10.0.202.0/24"]

  enable_nat_gateway     = true
  single_nat_gateway     = true
#   one_nat_gateway_per_az = true

  public_subnet_tags = {
    "NetworkTier" = "Public"
  }

  private_subnet_tags = {
    "NetworkTier" = "Private"
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

# Ansible Controller Security Group
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

# Ansible Controller EC2 Instance
resource "aws_instance" "ansible_controller" {
  ami                    = data.aws_ami.ubuntu.id 
  instance_type          = "t2.micro"
  subnet_id              = module.vpc.public_subnets[0]
  vpc_security_group_ids = [aws_security_group.ansible_sg.id]
  key_name               = aws_key_pair.generated_key.key_name
  monitoring             = true
#   associate_public_ip_address = true  # Explicitly enable public IP

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

# Security group for Jenkins Master
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

# Jenkins Master EC2 Instance
resource "aws_instance" "jenkins_master" {
  ami                    = data.aws_ami.ubuntu.id 
  instance_type          = "t3.medium"
  subnet_id              = module.vpc.public_subnets[0]
  vpc_security_group_ids = [aws_security_group.jenkins_master_sg.id]
  key_name               = aws_key_pair.generated_key.key_name
#   iam_instance_profile   = aws_iam_instance_profile.jenkins_master.name
  monitoring             = true

  root_block_device {
    volume_size = 50
    volume_type = "gp3"
  }

  tags = {
    Name = "Jenkins-Master"
  }
}

# Jenkins Agent Security group
resource "aws_security_group" "jenkins_agent_sg" {
  name        = "jenkins-agent-sg"
  description = "Jenkins Agent security group"
  vpc_id      = module.vpc.vpc_id

  ingress {
    description     = "SSH from Controller & Master"
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = [aws_security_group.ansible_sg.id, aws_security_group.jenkins_master_sg.id]
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

# Jenkins Agent EC2 Instance
resource "aws_instance" "jenkins_agent" {
  count         = 1
  ami           = data.aws_ami.ubuntu.id 
  instance_type = "t3.micro"
  subnet_id     = module.vpc.public_subnets[0]
  vpc_security_group_ids = [aws_security_group.jenkins_agent_sg.id]
  key_name               = aws_key_pair.generated_key.key_name

  tags = {
    Name = "Jenkins-Agent"
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

# IAM Roles
# resource "aws_iam_instance_profile" "jenkins_master" {
#   name = "jenkins-master-profile"
#   role = aws_iam_role.jenkins_master.name
# }

# resource "aws_iam_role" "jenkins_master" {
#   name = "jenkins-master-role"

#   assume_role_policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [{
#       Action = "sts:AssumeRole"
#       Effect = "Allow"
#       Principal = {
#         Service = "ec2.amazonaws.com"
#       }
#     }]
#   })

#   managed_policy_arns = [
#     "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
#     "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
#   ]
# }

# module "eks" {
#   source            = "terraform-aws-modules/eks/aws"
#   version           = "20.0.0"  # Ensure you're using a compatible version
#   cluster_name      = "my-eks-cluster"
#   cluster_version   = "1.27"  # Set your desired Kubernetes version
#   vpc_id            = module.vpc.vpc_id
#   subnet_ids        = module.vpc.private_subnets  # Use private subnets for security
#   cluster_endpoint_private_access = true
#   cluster_endpoint_public_access  = false

#   enable_irsa       = true  # Enable IAM roles for service accounts

#   eks_managed_node_groups = {
#     default = {
#       instance_types = ["t3.medium"]
#       min_size       = 1
#       max_size       = 3
#       desired_size   = 2
#       disk_size      = 20
#       subnet_ids     = module.vpc.private_subnets
#     }
#   }
  

#   cluster_addons = {
#     coredns = {
#       resolve_conflicts = "OVERWRITE"
#     }
#     kube-proxy = {
#       resolve_conflicts = "OVERWRITE"
#     }
#     vpc-cni = {
#       resolve_conflicts = "OVERWRITE"
#     }
#   }

#   tags = {
#     Terraform   = "true"
#     Environment = "Production"
#     Project     = "CI/CD Pipeline"
#     CostCenter  = "DevOps"
#   }
# }

# resource "aws_security_group" "eks_nodes" {
#   vpc_id = module.vpc.vpc_id

#   ingress {
#     from_port   = 0
#     to_port     = 0
#     protocol    = "-1"
#     cidr_blocks = [module.vpc.vpc_cidr_block]
#   }
# }

# output "kubeconfig_command" {
#   value = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name}"
# }


