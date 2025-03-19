pipeline {
    agent any

    environment {
        IMAGE_NAME = "my-docker-app"
        ARTIFACTORY_URL = "trialces7pe.jfrog.io"  // Removed `https://`
        ARTIFACTORY_REPO = "docker-local"
        IMAGE_TAG = "${ARTIFACTORY_URL}/${ARTIFACTORY_REPO}/${IMAGE_NAME}:${BUILD_NUMBER}"
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
                            echo "Docker is installed. Version:"
                            docker -v
                        else
                            echo "Docker not found! Please install Docker on the Jenkins agent."
                            exit 1
                        fi
                    '''
                }
            }
        }

        // stage('Create JFrog Repository') {
        //     steps {
        //         script {
        //             withCredentials([string(credentialsId: 'b3568e44-b80f-4700-8194-fd0547ee6230', variable: 'ARTIFACTORY_TOKEN')]) {
        //                 def repoExists = sh(
        //                     script: """
        //                         curl -s -o /dev/null -w "%{http_code}" -u _apikey:$ARTIFACTORY_TOKEN \
        //                         -X GET "https://${ARTIFACTORY_URL}/artifactory/api/repositories/${ARTIFACTORY_REPO}"
        //                     """,
        //                     returnStdout: true
        //                 ).trim()

        //                 if (repoExists != "200") {
        //                     echo "Repository does not exist. Creating it..."
        //                     def repoConfig = """{
        //                         "key": "${ARTIFACTORY_REPO}",
        //                         "rclass": "local",
        //                         "packageType": "docker"
        //                     }"""
        //                     sh """
        //                         curl -u _apikey:$ARTIFACTORY_TOKEN \
        //                         -X PUT "https://${ARTIFACTORY_URL}/artifactory/api/repositories/${ARTIFACTORY_REPO}" \
        //                         -H "Content-Type: application/json" \
        //                         -d '${repoConfig}'
        //                     """
        //                 } else {
        //                     echo "Repository already exists. Skipping creation."
        //                 }
        //             }
        //         }
        //     }
        // }

        // stage('Build Docker Image') {
        //     steps {
        //         script {
        //             def dockerImage = docker.build("${IMAGE_NAME}:${BUILD_NUMBER}")
        //         }
        //     }
        // }

        stage('Docker Build and Publish') {
                steps {
                    script {
                        // Build Docker image using the JAR file
                        def dockerImage = docker.build("${IMAGE_NAME}:${BUILD_NUMBER}")

                        // Authenticate with Artifactory Docker registry
                        docker.withRegistry('https://trialces7pe.jfrog.io', 'b3568e44-b80f-4700-8194-fd0547ee6230') {
                            // Push the Docker image to Artifactory repository
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
