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

        stage('Create JFrog Repository') {
            steps {
                script {
                    withCredentials([
                        string(credentialsId: '29716f24-0464-4d5f-87c7-7fbd65088fc5', variable: 'ARTIFACTORY_TOKEN'),
                        string(credentialsId: 'artifactory-username', variable: 'ARTIFACTORY_USERNAME')
                    ]) {
                        def repoExists = sh(
                            script: """
                                curl -s -o /dev/null -w "%{http_code}" -u $ARTIFACTORY_USERNAME:$ARTIFACTORY_TOKEN \
                                -X GET "https://${ARTIFACTORY_URL}/artifactory/api/repositories/${ARTIFACTORY_REPO}"
                            """,
                            returnStdout: true
                        ).trim()

                        if (repoExists != "200") {
                            echo "Repository does not exist. Creating it..."
                            def repoConfig = """{
                                "key": "${ARTIFACTORY_REPO}",
                                "rclass": "local",
                                "packageType": "docker"
                            }"""
                            sh """
                                curl -u $ARTIFACTORY_USERNAME:$ARTIFACTORY_TOKEN \
                                -X PUT "https://${ARTIFACTORY_URL}/artifactory/api/repositories/${ARTIFACTORY_REPO}" \
                                -H "Content-Type: application/json" \
                                -d '${repoConfig}'
                            """
                        } else {
                            echo "Repository already exists. Skipping creation."
                        }
                    }
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    def dockerImage = docker.build("${IMAGE_NAME}:${BUILD_NUMBER}")
                }
            }
        }

        stage('Push Docker Image to JFrog') {
            steps {
                script {
                    withCredentials([
                        string(credentialsId: '29716f24-0464-4d5f-87c7-7fbd65088fc5', variable: 'ARTIFACTORY_TOKEN'),
                        string(credentialsId: 'artifactory-username', variable: 'ARTIFACTORY_USERNAME')
                    ]) {
                        sh '''
                            echo "$ARTIFACTORY_TOKEN" | docker login https://${ARTIFACTORY_URL} -u "$ARTIFACTORY_USERNAME" --password-stdin
                            
                            docker tag ${IMAGE_NAME}:${BUILD_NUMBER} ${IMAGE_TAG}
                            
                            docker push ${IMAGE_TAG}
                            
                            docker logout https://${ARTIFACTORY_URL}
                        '''
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
