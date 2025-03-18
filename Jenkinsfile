pipeline {
    agent any

    environment {
        IMAGE_NAME = "my-docker-app"
        ARTIFACTORY_URL = "https://trialces7pe.jfrog.io"
        ARTIFACTORY_REPO = "docker-local"
        IMAGE_TAG = "${ARTIFACTORY_URL}/${ARTIFACTORY_REPO}/${IMAGE_NAME}:${BUILD_NUMBER}"
    }

    stages {
        stage('Checkout Code') {
            steps {
                git branch: 'main', url: 'https://github.com/nvsblmike/deploying-vpc-sec_grp-jenkins-ansible-using-terraform.git'
            }
        }

        stage('Create JFrog Repository') {
            steps {
                script {
                    def repoConfig = """{
                        "key": "${ARTIFACTORY_REPO}",
                        "rclass": "local",
                        "packageType": "docker"
                    }"""
                    withCredentials([string(credentialsId: 'b3568e44-b80f-4700-8194-fd0547ee6230', variable: 'ARTIFACTORY_TOKEN')]) {
                        sh """
                            curl -H "Authorization: Bearer $ARTIFACTORY_TOKEN" \
                            -X PUT "${ARTIFACTORY_URL}/artifactory/api/repositories/${ARTIFACTORY_REPO}" \
                            -H "Content-Type: application/json" \
                            -d '${repoConfig}' || echo "Repository might already exist"
                        """
                    }
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    dockerImage = docker.build(IMAGE_TAG)
                }
            }
        }

        stage('Push Docker Image to JFrog') {
            steps {
                script {
                    withCredentials([string(credentialsId: 'b3568e44-b80f-4700-8194-fd0547ee6230', variable: 'ARTIFACTORY_TOKEN')]) {
                        sh """
                            echo "$ARTIFACTORY_TOKEN" | docker login ${ARTIFACTORY_URL} -u "ci-user" --password-stdin
                            docker push ${IMAGE_TAG}
                        """
                    }
                }
            }
        }
    }

    post {
        success {
            echo "Docker image successfully built and pushed to JFrog Artifactory."
        }
        failure {
            echo "Build failed! Check logs for more details."
        }
    }
}
