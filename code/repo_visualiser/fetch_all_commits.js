const Octokit = require("@octokit/rest").Octokit;
const fs = require("fs");
const octokit = new Octokit({
  //auth: <token>,
});

octokit
  .paginate(
    octokit.repos.listCommits.endpoint.merge({
      owner: "castor-software",
      repo: "rethread",
      per_page: 100,
    })
  )
  .then((data) => {
    fs.writeFileSync("rethread_commits.json", JSON.stringify(data));
  });
