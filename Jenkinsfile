pipeline {
  agent any

  parameters {
    booleanParam(name: 'FORCE_DEPLOY', defaultValue: false, description: 'Force deploy?')
  }

  environment {
    APP_NAME = 'styled-components'
  }

  stages {
    stage('prepare') {
      steps {
        sh 'docker network create gateway || true'
        script {
          env.COMMIT_HASH = sh(returnStdout: true, script: 'git rev-parse HEAD').trim().take(7)

          withAWSParameterStore(namePrefixes: 'shared.NPM_TOKEN', regionName: env.AWS_DEFAULT_REGION) {
            env.NPM_TOKEN = env.SHARED_NPM_TOKEN
          }
        }
      }
    }
    stage('build') {
      steps {
        sh 'docker-compose build build'
      }
    }
    stage('test') {
      parallel {
        stage('test') {
          steps {
            sh 'docker-compose run --rm test'
          }
        }
        stage('flow') {
          steps {
            sh 'docker-compoe run --rm test yarn flow'
          }
        }
        stage('lint') {
          steps {
            sh 'docker-compose run --rm test yarn lint'
          }
        }
        stage('size') {
          steps {
            sh 'docker-compose run --rm test yarn size'
          }
        }
      }
    }
    stage('publish') {
      when {
        expression {
          params.FORCE_DEPLOY
        }
      }
      steps {
        milestone 1
        lock('publish') {
          sshagent (credentials: ['GITHUB_CI_SSH_KEY']) {
            script {
              withAWSParameterStore(namePrefixes: 'shared.NPM_TOKEN', regionName: env.AWS_DEFAULT_REGION) {
                env.NPM_TOKEN = env.SHARED_NPM_TOKEN
              }
            }

            sh '''
              docker-compose run --rm \
                --volume "$SSH_AUTH_SOCK":/tmp/agent.sock \
                -e SSH_AUTH_SOCK=/tmp/agent.sock \
                -e NPM_TOKEN=$NPM_TOKEN \
                publish
            '''
          }
        }
      }
      post {
        success {
          slackSend color: 'good',
                    message: "[*${env.APP_NAME}*:${env.BRANCH_NAME}] (<https://github.com/intellihr/${env.APP_NAME}/commit/${env.COMMIT_HASH}|${env.COMMIT_HASH}>) *SUCCESSFULLY* deployed <${env.BUILD_URL}|#${env.BUILD_NUMBER}>"
        }
        failure {
          slackSend color: 'danger',
                    message: "[*${env.APP_NAME}*:${env.BRANCH_NAME}] (<https://github.com/intellihr/${env.APP_NAME}/commit/${env.COMMIT_HASH}|${env.COMMIT_HASH}>) *FAILED* deploying <${env.BUILD_URL}|#${env.BUILD_NUMBER}>"
        }
      }
    }
  }
  post {
    always {
      sh '''
        docker run --rm -v $(pwd):/tmp alpine chown -R $(id -u) /tmp
      '''
      sh 'docker-compose down -v'
    }
  }
}
