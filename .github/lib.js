module.exports = {
  findPull: async function (context, github) {
    console.log("Finding PR based on ref", context.ref);
    const repository = context.payload.repository;
    const list = await github.rest.pulls.list({
      owner: repository.owner.login,
      repo: repository.name,
      head: context.ref,
      sort: "updated",
    });
    if (list.length > 0)
      return list[0];
    return null;
  },
  parseTags: function (text) {
    const regexp = /\B!([^\s=]+)(=[^\s]+)?/g;
    const tagMatches = [...text.matchAll(regexp)];
    return tagMatches;
  },
  readPullTagsFromString: function (default_, str) {
    var result = default_;
    const tagMatches = this.parseTags(str);
    for (const match of tagMatches) {
      let key = match[1];
      let value = match[2] ? match[2].slice(1) : "";
      console.log(`Found tag: ${key} = ${value}`);
      result[key] = value;
    }

    return result;
  },
  readPullTagsFromContext: async function (default_, context, github) {
    var pr = context.payload.pull_request;
    if(!pr) {
      pr = await this.findPull(context, github);
    }

    if (pr && pr.body) {
      return this.readPullTagsFromString(default_, pr.body);
    } else {
      console.log("No PR found, ignoring tags");
      return default_;
    }
  },
  requestWorkflowRerun: async function (context, github) {
    const pr = context.payload.pull_request;
    const repository = context.payload.repository;

    const pr1 = await github.rest.pulls.get({
      owner: repository.owner.login,
      repo: repository.name,
      pull_number: pr.number,
    });
    const head = pr1.data.head;

    let runs = await github.rest.actions.listWorkflowRuns({
      owner: repository.owner.login,
      repo: repository.name,
      workflow_id: "blank.yml",
      branch: head.ref,
    });

    let actualRuns = runs.data.workflow_runs;
    if (actualRuns.length > 0) {
      let id = actualRuns[0].id;
      await github.rest.actions.reRunWorkflow({
        owner: repository.owner.login,
        repo: repository.name,
        run_id: id,
      });
    }
  }
};

// let tags = processTags({ against: "devel" }, context, core);
// core.setOutput("against", tags.agaist);