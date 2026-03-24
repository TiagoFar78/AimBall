# AimBall

## Overview

AimBall is a browser-based multiplayer game inspired by Haxball futsal and football, with kick mechanics similar to Omega Strikers. Players control circular avatars, move using keyboard, and aim kicks with the mouse.

This project is designed for small matches with friends and focuses on responsiveness and simple gameplay rather than scalability or security.

## Running the Game (Local and Same Network)

### 1. Install dependencies

In the `server` folder:

```bash
npm install
```

### 2. Start the server

Execute `run.bat` file or run in console

```bash
node server/server
```

### 3. Open the game on browser

In the same pc that is running the server is enough to go to

```bash
localhost:8081
```

If you are in the same network you need to get the server's ip in the network. After using `ipconfig` in server's pc find the **IPv4 Address** under **Ethernet adapter Ethernet** and add the port after. It should look like

```bash
192.168.1.*:8081
```

## Hosting the game in a server - Google service setup (owner notes)

### Start the server

1. Go to [service creation page](https://console.cloud.google.com/run/create?enableapi=false&hl=pt&project=steady-atlas-440818-e2).
1. Select Github
1. Cloud version
   1. Repository provider: Gihub
   2. Reposiroty: TiagoFar78/AimBall
   3. Branch: master
   4. Build type: Go, Node.js, Python, Java, .NET Core, Ruby ou PHP
   5. Build context: `/` (Unchanged)
   6. Entry point: `node server/server`
   7. Function target: *blank* (Unchanged)
2. Service name: aimball
3. Region: *Closest - maybe Madrid*
4. Authentication: Allow public access
5. Billing: Solicitation based
6. Scalling: Manual - 1 instance
7. Entry: all
8. Open containers:
   1. Port: 8081
   2. Everything else leave unchanged

Since it is not possible to just stop the server, don't forget to delete the service after in the [service page](https://console.cloud.google.com/run/services?hl=pt&project=steady-atlas-440818-e2), by selecting the service and removing it.

### Open the game on browser

The link that players will use to connect will be displayed in the service page.
