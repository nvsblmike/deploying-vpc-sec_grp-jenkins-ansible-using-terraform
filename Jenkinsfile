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
                    withCredentials([string(credentialsId: 'b3568e44-b80f-4700-8194-fd0547ee6230', variable: 'ARTIFACTORY_TOKEN')]) {
                        def repoExists = sh(
                            script: """
                                curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer $ARTIFACTORY_TOKEN" \
                                -X GET "${ARTIFACTORY_URL}/artifactory/api/repositories/${ARTIFACTORY_REPO}"
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
                                curl -H "Authorization: Bearer $ARTIFACTORY_TOKEN" \
                                -X PUT "${ARTIFACTORY_URL}/artifactory/api/repositories/${ARTIFACTORY_REPO}" \
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
                    dockerImage = docker.build(IMAGE_TAG)
                }
            }
        }

        stage('Push Docker Image to JFrog') {
            steps {
                script {
                    withCredentials([string(credentialsId: 'b3568e44-b80f-4700-8194-fd0547ee6230', variable: 'ARTIFACTORY_TOKEN')]) {
                        sh '''
                            echo "$ARTIFACTORY_TOKEN" | docker login ${ARTIFACTORY_URL}/docker-local -u "ci-user" --password-stdin
                            docker push ${IMAGE_TAG}
                            docker logout ${ARTIFACTORY_URL}/docker-local
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
