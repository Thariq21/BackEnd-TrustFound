pipeline {
    agent any

    environment {
        NAMESPACE = 'trustfound'
        APP_NAME = 'trustfound-backend'
        GITHUB_CREDENTIALS_ID = 'cred-github-thariq'
    }

    stages {
        stage('Checkout Source') {
            steps {
                // Mengambil kode terbaru dari GitHub
                git credentialsId: "${GITHUB_CREDENTIALS_ID}", 
                    url: 'https://github.com/Thariq21/BackEnd-TrustFound.git', 
                    branch: 'main'
            }
        }

        stage('Build Image') {
            steps {
                script {
                    echo "--- Memulai Binary Build di OpenShift ---"
                    // Mengirim folder saat ini ke OpenShift untuk di-build menjadi image
                    sh "oc start-build ${APP_NAME} --from-dir=. --follow -n ${NAMESPACE}"
                }
            }
        }

        stage('Deploy & Rollout') {
            steps {
                script {
                    echo "--- Memicu Rollout Deployment terbaru ---"
                    sh "oc rollout restart deployment/${APP_NAME} -n ${NAMESPACE}"
                    
                    echo "--- Menunggu status Pod Ready ---"
                    sh "oc rollout status deployment/${APP_NAME} -n ${NAMESPACE}"
                }
            }
        }
    }

    post {
        success {
            echo "----------------------------------------------------------"
            echo "BERHASIL: Backend TrustFound sudah running di OpenShift!"
            echo "----------------------------------------------------------"
        }
        failure {
            echo "----------------------------------------------------------"
            echo "GAGAL: Cek 'Console Output' untuk melihat letak errornya."
            echo "----------------------------------------------------------"
        }
    }
}