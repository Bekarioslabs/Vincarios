'use strict';

function main() {
  return {
    app: 'ZEUS Agent',
    status: 'scaffold'
  };
}

module.exports = {
  main
};

if (require.main === module) {
  console.log(main());
}
