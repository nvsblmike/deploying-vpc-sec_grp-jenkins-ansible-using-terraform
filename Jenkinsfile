pipeline {
    agent any

    environment {
        SONARQUBE_TOKEN = credentials('df764ea7-863e-4577-ab5a-995389c5041e') // Ensure correct credentials ID
    }

    stages {
        stage('Cleanup Workspace') {
            steps {
                script {
                    sh 'rm -rf * || true'
                }
            }
        }

        stage('Checkout') {
            steps {
                script {
                    checkout([$class: 'GitSCM',
                        branches: [[name: '*/main']],  // Ensure 'main' branch is used
                        doGenerateSubmoduleConfigurations: false,
                        extensions: [[$class: 'CleanCheckout']],  // Ensures a fresh checkout
                        submoduleCfg: [],
                        userRemoteConfigs: [[
                            url: 'https://github.com/nvsblmike/deploying-vpc-sec_grp-jenkins-ansible-using-terraform.git',
                            credentialsId: '0b5f59f0-67e7-487a-8e47-bd0b35326452'
                        ]]
                    ])
                }
            }
        }

        stage('Build') {
            steps {
                script {
                    sh 'echo "Build Step Running..."'
                    // Add actual build commands (e.g., Terraform, Ansible, etc.)
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                script {
                    withSonarQubeEnv('SonarQube') {
                        sh 'sonar-scanner -Dsonar.projectKey=my-project -Dsonar.sources=.'
                    }
                }
            }
        }

        stage('Quality Gate') {
            steps {
                script {
                    timeout(time: 2, unit: 'MINUTES') {
                        waitForQualityGate abortPipeline: true
                    }
                }
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully!'
        }
        failure {
            echo 'Pipeline failed!'
        }
    }
}
