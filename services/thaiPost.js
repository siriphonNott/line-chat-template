const axios = require('axios');
const baseUrl = "https://thai-post.herokuapp.com/thai-post";

const getTracking = (id) => {
  return new Promise((resolve, reject) => {
    axios.get(`${baseUrl}/${id}`)
      .then(function (response) {
        // handle success
        console.log("data: ", response.data['data']);
        resolve(response.data['data']);
      })
      .catch(function (error) {
        // handle error
        if (error.response) {
          console.log(`http status code: [${error.response.status}] body: ${error.response.data}`);
        }
        resolve(null);
      });
  });


};

exports.getTracking = getTracking;