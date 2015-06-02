'use strict';

module.exports = {
  scenarios: [
    {
      name: "ember-stable",
      dependencies: {
        "ember": "1.12.1"
      }
    }, {
      name: "ember-beta",
      dependencies: {
        "ember": "1.13.0-beta.2"
      }
    }, {
      name: "ember-canary",
      dependencies: {
        "ember": "components/ember#canary"
      },
      resolutions: {
        "ember": "canary"
      }
    }
  ]
};
