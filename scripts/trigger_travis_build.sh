body='{
"request": {
  "message": "Test prebuilt binaries",
  "branch": "prebuilt-testing"
}}'

curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Travis-API-Version: 3" \
  -H "Authorization: token $TRAVIS_TOKEN" \
  -d "$body" \
  https://api.travis-ci.org/repo/zeromq%2Fzeromq.js/requests
