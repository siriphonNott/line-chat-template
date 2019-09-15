const axios = require('axios');
const baseUrl = "https://thai-post.herokuapp.com/thai-post";

const getTracking = (id) => {
  axios.get(`${baseUrl}/${id}`)
  .then(function (response) {
    // handle success
    console.log(response);
  })
  .catch(function (error) {
    // handle error
    console.log(error);
  });
  
};

exports.getTracking = getTracking;