# Contributing to `styled-components`

As the creators and maintainers of this project, we want to ensure that `styled-components` lives and continues to grow and evolve. The evolution of the library should never be blocked by any single person's time. One of the simplest ways of doing this is by encouraging a larger set of shallow contributors. Through this, we hope to mitigate the problems of a project that needs updates but there's no-one who has the power to do so.

## Ownership

**If your Pull Request is merged, regardless of content, you're eligible for push access to the organization on GitHub.** This is checked for on pull request merges and an invite is sent automatically. (thanks to an [Aeryn instance](https://github.com/Moya/Aeryn/) that [@mxstbr](https://github.com/mxstbr) runs)

Offhand, it's easy to imagine that this would make code quality suffer, but in reality it offers fresh perspectives to the codebase and encourages ownership from people who are depending on the project. If you are building a project that relies on this codebase, then you probably have the skills to improve it and offer valuable feedback.

Everyone comes in with their own perspective on what a project could/should look like, and encouraging discussion can help expose good ideas sooner.

### Why do we give push access?

It can be overwhelming to be offered the chance to wipe the source code for a project. Don't worry, we don't let you push to master. All code has to be reviewed by at least two contributors or one core team member, and we have the convention that someone other than the submitter has to merge non-trivial pull requests.

**As an organization contributor, you can merge other people's pull requests, or other contributors can merge yours.** You likely won't be assigned a pull request, but you're welcome to jump in and take a code review on topics that interest you.

This project is not continuously deployed, there is space for debate after review too. This means there's always a chance to revert, or to make an amending pull request. If it feels right, merge.

### How can we help you get comfortable contributing?

It's normal for a first pull request to be a potential fix for a problem, and moving on from there to helping the project's direction can be difficult. We try to help contributors cross that barrier by offering good first step issues. These issues can be fixed without feeling like you're stepping on toes. Ideally, these are non-critical issues that are well defined. They will be purposely avoided by mature contributors to the project, to make space for others.

We aim to keep all technical discussions inside GitHub issues, and all other discussions in our [Spectrum community](https://spectrum.chat/styled-components). This is to make sure valuable discussions are public and discoverable via search engines. If you have questions about a specific PR, want to discuss a new API idea etc GitHub issues are the right place. If you have questions about how to use the library, or how the project is running - the [Spectrum community](https://spectrum.chat/styled-components) is the place to go.

### Our expectations on you as a contributor

To quote [@alloy](https://github.com/alloy) from [this issue](https://github.com/Moya/Moya/issues/135):

> Don't ever feel bad for not contributing to open source.

We want contributors to provide ideas, keep the ship shipping and to take some of the load from others. It is non-obligatory; we’re here to get things done in an enjoyable way. :trophy:

The fact that you'll have push access will allow you to:

* Avoid having to fork the project if you want to submit other pull requests as you'll be able to create branches directly on the project.
* Help triage issues, merge pull requests.
* Pick up the project if other maintainers move their focus elsewhere.

It's up to you to use those superpowers or not though 😉

If someone submits a pull request that's not perfect, and you are reviewing, it's better to think about the PR's motivation rather than the specific implementation. Having braces on the wrong line should not be a blocker. Though we do want to keep test coverage high, we will work with you to figure that out together.

### What about if you have problems that cannot be discussed in a public issue?

[Max Stoiber](https://twitter.com/mxstbr) and [Phil Pluckthun](https://twitter.com/_philpl) (Twitter links) have contactable emails on their GitHub profiles, and are happy to talk about any problems via those or via Twitter DMs.

### Code of Conduct

It's also important to note that all repositories under the `styled-components` banner have a [Code of Conduct](./CODE_OF_CONDUCT.md). It is important that you review and enforce this CoC should any violations happen.

## Code contributions

Here is a quick guide to doing code contributions to the library.

1. Find some issue you're interested in, or a feature that you'd like to tackle.
   Also make sure that no one else is already working on it. We don't want you to be
   disappointed.

2. Fork, then clone: `git clone https://github.com/YOUR_USERNAME/styled-components.git`

3. Create a branch with a meaningful name for the issue: `git checkout -b fix-something`

4. Make your changes and commit: `git add` and `git commit`

5. Make sure that the tests still pass: `npm test` and `npm run flow` (for the type checks)

6. Push your branch: `git push -u origin your-branch-name`

7. Submit a pull request to the upstream styled-components repository.

8. Choose a descriptive title and describe your changes briefly.

9. Wait for a maintainer to review your PR, make changes if it's being recommended, and get it merged.

10. Perform a celebratory dance! :dancer:

### How do I set up the project?

Run [`yarn install`](https://yarnpkg.com/) and edit code in the `src/` folder. It's luckily very simple! :wink:

### How do I verify and test my changes?

To make development process easier we provide a Sandbox React application in this repo which automatically uses your local version of the `styled-components` library. That means when you make any changes in the `src/` folder they'll show up automatically there!

To use the sandbox, follow these steps:

1. Go to sandbox folder: `cd sandbox`

2. Install all the dependencies: `yarn install` or `npm install`

3. Run `yarn start` or `npm start` to start sandbox server

Now you should have the sandbox running on `localhost:3000`. The Sandbox supports client-side and server-side rendering.

You can use an interactive editor, powered by [`react-live`](https://react-live.philpl.com/), to test your changes. But if you want more control, you can edit the sandbox itself too:

* Root `<App>` component is located at `styled-components/sandbox/src/App.js` file

* Client-side entry point is at `styled-components/sandbox/src/browser.js`

* Server-side entry point is at `styled-components/sandbox/src/server.js`

In the sandbox source, `styled-components` is an alias to `styled-components/src` folder, so you can edit the source directly and dev-server will handle rebuilding the source and livereloading your sandbox after the build is done.

When you commit our pre-commit hook will run, which executes `lint-staged`. It will run the linter automatically and warn you if the code you've written doesn't comply with our code style guidelines.

### How do I run the benchmarks?

We have three different benchmarks: mounting a deep tree, mounting a wide tree and updating dynamic styles. Shoutout to [@necolas](https://github.com/necolas), who wrote these for `react-native-web` and whom we stole these benchmarks from.

To run the benchmarks run:

```sh
yarn run benchmarks
```

You can also get traces that you can look at in the Chrome DevTools "Performance" panel by running

```sh
yarn run benchmarks --tracing
```

### How do I fix my pre-commit hook?

We've recently migrated from `pre-commit` to `husky`, so if you're running into issues during this migration, you'll likely have to do the following:

```sh
rm .git/hooks/pre-commit*
node ./node_modules/husky/bin/install.js
```

This will delete the old `pre-commit` git hook and install husky's one.
Without the proper uninstallation script of the `pre-commit` package, this is necessary because `husky` will skip its installation when
a git hook is already present.

## Release process

[Core team members](./CORE_TEAM.md) have the responsibility of pushing new releases to npm. The release process is as follows:

1. Install `np` by Sindre Sorhus with `npm i -g np`. (note: you only have to do this once) `np` makes sure that everything is correct and runs tests and a build before it releases the new version for you.
2. Make sure you have the latest changes and are on the master branch: `git checkout master && git pull origin master`
3. Create a new branch based on the version number, for example `git checkout -b 3.4.1`
4. Update the [CHANGELOG.md](./CHANGELOG.md) with the new version number, add a new Unreleased section at the top and edit the links at the bottom so everything is linked correctly
5. Commit the Changelog changes with `git commit -m 'Update CHANGELOG'`
6. Push the branch to the repo with `git push -u origin <branchname>`
7. Run `np --any-branch` and follow its instructions
8. Congratulations, you just published a new release of `styled-components`! :tada: Let everybody know on Twitter, in our community and all the other places

## Credits

These contribution guidelines are based on https://github.com/moya/contributors, big thanks to @alloy, @orta et al. for the inspiration and guidance.


## Financial contributions

We also welcome financial contributions in full transparency on our [open collective](https://opencollective.com/styled-components).
Anyone can file an expense. If the expense makes sense for the development of the community, it will be "merged" in the ledger of our open collective by the core contributors and the person who filed the expense will be reimbursed.


## Credits


### Contributors

Thank you to all the people who have already contributed to styled-components!
<a href="graphs/contributors"><img src="https://opencollective.com/styled-components/contributors.svg?width=890" /></a>


### Backers

Thank you to all our backers! [[Become a backer](https://opencollective.com/styled-components#backer)]

<a href="https://opencollective.com/styled-components#backers" target="_blank"><img src="https://opencollective.com/styled-components/backers.svg?width=890"></a>


### Sponsors

Thank you to all our sponsors! (please ask your company to also support this open source project by [becoming a sponsor](https://opencollective.com/styled-components#sponsor))

<a href="https://opencollective.com/styled-components/sponsor/0/website" target="_blank"><img src="https://opencollective.com/styled-components/sponsor/0/avatar.svg"></a>
<a href="https://opencollective.com/styled-components/sponsor/1/website" target="_blank"><img src="https://opencollective.com/styled-components/sponsor/1/avatar.svg"></a>
<a href="https://opencollective.com/styled-components/sponsor/2/website" target="_blank"><img src="https://opencollective.com/styled-components/sponsor/2/avatar.svg"></a>
<a href="https://opencollective.com/styled-components/sponsor/3/website" target="_blank"><img src="https://opencollective.com/styled-components/sponsor/3/avatar.svg"></a>
<a href="https://opencollective.com/styled-components/sponsor/4/website" target="_blank"><img src="https://opencollective.com/styled-components/sponsor/4/avatar.svg"></a>
<a href="https://opencollective.com/styled-components/sponsor/5/website" target="_blank"><img src="https://opencollective.com/styled-components/sponsor/5/avatar.svg"></a>
<a href="https://opencollective.com/styled-components/sponsor/6/website" target="_blank"><img src="https://opencollective.com/styled-components/sponsor/6/avatar.svg"></a>
<a href="https://opencollective.com/styled-components/sponsor/7/website" target="_blank"><img src="https://opencollective.com/styled-components/sponsor/7/avatar.svg"></a>
<a href="https://opencollective.com/styled-components/sponsor/8/website" target="_blank"><img src="https://opencollective.com/styled-components/sponsor/8/avatar.svg"></a>
<a href="https://opencollective.com/styled-components/sponsor/9/website" target="_blank"><img src="https://opencollective.com/styled-components/sponsor/9/avatar.svg"></a>
