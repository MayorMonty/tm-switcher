As always, contributions are always welcome! To develop, you will need to get
access to a set of Third Party Integrations from DWAB.

## Run From Source

If you don't want to run from the precompiled executable, you can alternatively
run this program from the source code. This requires you to have the following
software installed:

- [Nodejs](https://nodejs.org) v14
- [Git](https://git-scm.com) (recommended)
- npm modules
  - typescript
  - atem-connection
  - obs-websocket-js
  - vex-tm-client

To run from source, you would need to supply your third-party credentials from
DWAB. More information about obtaining these can be found in the
[REC Foundation Knowledge Base](https://kb.roboticseducation.org/hc/en-us/articles/19238156122135)

1. Clone or download this repository

```
git clone git@github.com:brenapp/tm-switcher.git
cd tm-switcher
```

2. Enter your client credentials issued by DWAB

Create the secrets directory from the template

```bash
cp -r secret.template secret
```

Edit `secret/vextm.json` to include your client credentials. It should look
something like

```json
{
  "client_id": "<client ID issued by DWAB>",
  "client_secret": "<client secret issued by DWAB>",
  "grant_type": "client_credentials",
  "expiration_date": "<client credential expiration issued by DWAB converted to MS>" // Google "convert time to ms" for conversion tools
}
```

3. In a terminal window inside the cloned source, run the following commands:

```bash
npm install
npm run-script build
```

3. To run the program, enter the command:

```bash
npm run-script run
```

## Notice

By submitting contributions to this project, you agree to license all
contributions under the current project license if merged. The current project
license can be obtained at
https://github.com/brenapp/tm-switcher/blob/master/LICENSE.

Additionally, you attest that you have the legal right of authorship for the
changes you are submitting.
