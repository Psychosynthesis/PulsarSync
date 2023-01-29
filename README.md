# AtomSync

Although Microsoft has buried Atom (which, as we all know, is quite typical for this nasty company - to buy competitors projects and shut them down), the community still continues to use Atom. There are even attempts to revive him (Pulsar), but they seem to be moving in the wrong direction. Atom should remain a simple and fast editor without unnecessary features.

One of the most useful additions for Atom was `remote-sync`, which for some reason was not updated and did not fix bugs. I fixed his mistakes in order to continue using this add-on, because. it is quite convenient.

## So what is it?

AtomSync let you use SFTP and FTP features inside Atom, having the ability to upload and download files directly from inside Atom.

AtomSync is a revision of two projects: `remote-sync` which was abandoned in 2016 and `remote-sync-pro` which fixed some of the bugs of the first package.

In this version, the rather dubious `diff`-function, which caused a lot of glitches, has been removed, several bugs have been fixed, and support for keepalive connections has been added.

The name config-file is left the same as in the original `.remote-sync.json` for compatibility.

## Features

- Uploading/downloading files to/from the server
- Monitoring files for external changes and automatically uploading - useful for scss/less compiling
- Support for both SCP/SFTP and FTP

## Extras

- Toggle for uploading changes automatically when you save a file
- Define files to be monitored
- Toggle the logs for extra information
- Toggle the hiding and showing of the log panel
- Set custom config name
- Support for native Atom Notifications

## Installation

Since the atom package subsystem is no longer running, the only way to install a package is as follows:
- Download / clone this repository to your `/home/user/.atom/packages/atom-sync`
- Enter the directory
- Run `apm install`

Please note that the finish folder must be named exactly "atom-sync", because apm packages (as and `npm` too) don't recognize large and small characters.

## Usage

You can configure AtomSync by next ways:

### Existing project

#### Via Atom (recommended)

1. Right click main project folder
2. Navigate to Remote Sync PRO > Configure
3. Fill in the details / select options
4. Hit save

#### Manually

1. Add a file named `.remote-sync.json` to your project
2. Add/configure with one of the contents below
3. Save the file


## Options

The `.remote-sync.json` in your project root will use these options:


| Option            | Datatype | Default                         | Details                                                                                        |
|-------------------|----------|---------------------------------|------------------------------------------------------------------------------------------------|
| `transport`       | String   | ""                              | `scp` for SCP/SFTP, or `ftp` for FTP                                                           |
| `hostname`        | String   | ""                              | Remote host address                                                                            |
| `port`            | String   | ""                              | Remort port to connect on (typically 22 for SCP/SFTP, 21 for FTP)                              |
| `username`        | String   | ""                              | Remote host username                                                                           |
| `password`        | String   | ""                              | Remote host password                                                                           |
| `keyfile`         | String   | ""                              | Absolute path to SSH key (only used for SCP)                                                   |
| `secure`          | Boolean  | false                           | Set to true for both control and data connection encryption (only used for FTP)                |
| `passphrase`      | String   | ""                              | Passphrase for the SSH key (only used for SCP)                                                 |
| `useAgent`        | String   | false                           | Whether or not to use an agent process (only used for SCP)                                     |
| `target`          | String   | ""                              | Target directory on remote host                                                                |
| `source`          | String   | ""                              | Source directory relative to project root                                                      |
| `ignore`          | Array    | [".remote-sync.json",".git/**"] | Array of [minimatch](https://github.com/isaacs/minimatch) patterns of files to ignore          |
| `watch`           | Array    | []                              | Array of files (relative to project root - starting with "/") to watch for changes             |
| `keepalive`       | Integer  | 0                               | Number of seconds to wait between two keepalive                                                |
| `uploadMirrors`   | Array    | []                              | Transport mirror config array when upload                                                      |
| `uploadOnSave`    | Boolean  | false                           | Whether or not to upload the current file when saved                                           |
| `saveOnUpload`    | Boolean  | false                           | Whether or not to save a modified file before uploading                                        |
| `useAtomicWrites` | Boolean  | false                           | Upload file using a temporary filename before moving to its final location (only used for SCP) |
| `deleteLocal`     | Boolean  | false                           | Whether or not to delete the local file / folder after remote delete                           |


## Example configuration's

### SCP example:

```json
{
  "transport": "scp",
  "hostname": "10.10.10.10",
  "port": 22,
  "username": "vagrant",
  "password": "vagrant",
  "keyfile": "/home/vagrant/.ssh/aws.pem",
  "passphrase": "your_passphrase",
  "target": "/home/vagrant/dirname/subdirname",
  "ignore": [
    ".remote-sync.json",
    ".git/**"
  ],
  "watch":[
    "/css/styles.css",
    "/index.html"
  ],
  "keepalive": 60
}
```

### SCP `useAgent` example:

```json
{
  "transport": "scp",
  "hostname": "10.10.10.10",
  "port": 22,
  "username": "vagrant",
  "useAgent": true,
  "target": "/home/vagrant/dirname/subdirname",
  "ignore": [
    ".remote-sync.json",
    ".git/**"
  ],
  "watch":[
    "/css/styles.css",
    "/index.html"
  ],
  "keepalive": 60
}
```

### FTP example:

```json
{
  "transport": "ftp",
  "hostname": "10.10.10.10",
  "port": 21,
  "username": "vagrant",
  "password": "vagrant",
  "target": "/home/vagrant/dirname/subdirname",
  "ignore": [
    ".remote-sync.json",
    ".git/**"
  ],
  "watch":[
    "/css/styles.css",
    "/index.html"
  ],
  "keepalive": 60
}
```

### Upload mirrors example:

```json
{
  "transport": "scp",
  "hostname": "10.10.10.10",
  "port": 22,
  "username": "vagrant",
  "password": "vagrant",
  "keyfile": "/home/vagrant/.ssh/aws.pem",
  "passphrase": "your_passphrase",
  "target": "/home/vagrant/dirname/subdirname",
  "ignore": [
    ".remote-sync.json",
    ".git/**"
  ],
  "watch":[
    "/css/styles.css",
    "/index.html"
  ],
  "uploadMirrors":[
    {
      "transport": "scp",
      "hostname": "10.10.10.10",
      "port": 22,
      "username": "vagrant",
      "password": "vagrant",
      "keyfile": "/home/vagrant/.ssh/aws.pem",
      "passphrase": "your_passphrase",
      "target": "/home/vagrant/dirname/subdirname_one",
      "ignore": [
        ".remote-sync.json",
        ".git/**"
      ]
    },
    {
      "transport": "ftp",
      "hostname": "10.10.10.10",
      "port": 21,
      "username": "vagrant",
      "password": "vagrant",
      "target": "/home/vagrant/dirname/subdirname_two",
      "ignore": [
        ".remote-sync.json",
        ".git/**"
      ]
    }
  ]
}
```
