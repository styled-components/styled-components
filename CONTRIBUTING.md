# Contributing to `styled-components`

As the creators and maintainers of this project, we want to ensure that `styled-components` lives and continues to grow and evolve. The evolution of the library should never be blocked by any single person's time. One of the simplest ways of doing this is by encouraging a larger set of shallow contributors. Through this, we hope to mitigate the problems of a project that needs updates but there's no one who has the power to do so.

To quote [@alloy](https://github.com/alloy) from [this issue](https://github.com/Moya/Moya/issues/135):

> Don't ever feel bad for not contributing to open source.

We want contributors to provide ideas, keep the ship shipping and to take some of the load from others. It is non-obligatory; we’re here to get things done in an enjoyable way. :trophy:

## Code of Conduct

It's important to note that all repositories under the `styled-components` banner have a [Code of Conduct](./CODE_OF_CONDUCT.md). Please review and help enforce this CoC should any violations happen if you feel comfortable doing so.

## What if you have problems that cannot be discussed in a public issue?

These days, we highly recommend trying a tool like [ChatGPT](https://chat.openai.com/) to get instant feedback and tips. [@quantizor](https://x.com/quantizor) can be reached on X to start a private conversation, but please keep in mind that response is not guaranteed since open source is volunteer effort and subject to personal availability.

## Code contributions

### Environment setup

1. Ensure `yarn` is installed (https://yarnpkg.com/getting-started/install)
2. [Fork the repository](https://docs.github.com/en/get-started/quickstart/fork-a-repo), then pull it down to your disk: `git clone git@github.com:YOUR_USERNAME/styled-components.git`
3. Hop into the styled-components folder and run `yarn install`
4. Set the base repository as upstream: `git remote add upstream git@github.com:styled-components/styled-components.git` (makes it easier to pull updates to your fork)

At this point, the repository is initialized and ready for development! Check the `packages/` folder for the `styled-components` core library, a development `sandbox` (great for testing functionality), and the `benchmarks` suite.

Helpful commands:

- run unit tests: `yarn run test`
- check code style `yarn run prettier` (handled automatically if you have a prettier extension installed in your IDE)
- run build: `yarn run build`
- run dev sandbox: `yarn workspace sandbox dev` (or just `yarn dev` if you're in that folder)

### Making changes

Here is a quick guide to doing code contributions to the library.

1. Find some issue you're interested in, or a feature that you'd like to tackle.
   Also make sure that no one else is already working on it. We don't want you to be
   disappointed.

2. See [Environment setup](#environment-setup)

3. Update your local copy of the `main` branch with the latest code: `git checkout main && git pull -f upstream/main`

4. Create a branch with a meaningful name for the issue: `git checkout -b fix-something`

5. Run `yarn install` to capture any dependency updates

6. Make desired changes...

7. Push your branch: `git push -u origin your-branch-name`

8. Submit a pull request to the upstream styled-components repository.

9. Choose a descriptive title and describe your changes briefly.

10. Wait for a maintainer to review your PR, make changes if it's being recommended, and get it merged.

11. Perform a celebratory dance! :dancer:

### How do I run the benchmarks?

We have three different benchmarks: mounting a deep tree, mounting a wide tree and updating dynamic styles. Shoutout to [@necolas](https://github.com/necolas), who wrote these for `react-native-web` and whom we stole these benchmarks from.

To run the benchmarks run:

```sh
cd packages/benchmarks
```

Then build the benchmark page:

```sh
yarn run build
```

Then open the page in your browser:

```sh
yarn run open
```

On the page which opens, select the benchmark to run and click the "Run" button in your browser.

You may need to re-build styled-components and/or the benchmarks package after making changes if you want to re-run the benchmarks with your changes.

## Credits

These contribution guidelines are based on https://github.com/moya/contributors, big thanks to @alloy, @orta et al. for the inspiration and guidance.

## Financial contributions

Please see the "Sponsor" button at the top of the repository, thank you!

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
