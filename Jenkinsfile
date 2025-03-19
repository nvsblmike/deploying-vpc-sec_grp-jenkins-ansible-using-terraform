pipeline {
    agent any

    environment {
        IMAGE_NAME = "my-docker-app"
        ARTIFACTORY_URL = "trialces7pe.jfrog.io"
        ARTIFACTORY_REPO = "react-docker"
        IMAGE_TAG = "${ARTIFACTORY_URL}/${ARTIFACTORY_REPO}/${IMAGE_NAME}:${BUILD_NUMBER}"
        ARTIFACTORY_USERNAME = "soundboylesh77@gmail.com"  // Securely stored username
        ARTIFACTORY_PASSWORD = credentials('docker-repo') // Securely stored API Token
    }

    stages {
        stage('Checkout Code') {
            steps {
                git branch: 'main', url: 'https://github.com/nvsblmike/deploying-vpc-sec_grp-jenkins-ansible-using-terraform.git'
            }
        }

        stage('Ensure Docker is Installed') {
            steps {
                script {
                    sh '''
                        if command -v docker &> /dev/null
                        then
                            echo "✅ Docker is installed. Version:"
                            docker -v
                        else
                            echo "❌ Docker not found! Please install Docker on the Jenkins agent."
                            exit 1
                        fi
                    '''
                }
            }
        }


        stage('Docker Login') {
            steps {
                script {
                    sh """
                        echo "${ARTIFACTORY_PASSWORD}" | docker login -u"${ARTIFACTORY_USERNAME}" --password-stdin "${ARTIFACTORY_URL}"
                    """
                }
            }
        }

        stage('Docker Build and Publish') {
            steps {
                script {
                    def dockerImage = docker.build("${IMAGE_NAME}:${BUILD_NUMBER}")

                    docker.withRegistry("https://${ARTIFACTORY_URL}", 'b5db2c2c-9508-4394-a5f0-095eaa278e58') {
                        dockerImage.tag("${IMAGE_TAG}")
                        dockerImage.push()
                    }
                }
            }
        }
    }
    

    post {
        success {
            echo "✅ Docker image successfully built and pushed to JFrog Artifactory."
        }
        failure {
            echo "❌ Build failed! Check logs for more details."
        }
    }
}
