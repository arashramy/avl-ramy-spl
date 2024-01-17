# Contributing

When contributing to this repository, please first discuss the change you wish to make via issue,
email, Trello board, or any other method with the repository owners before making a change. 

## Setup IDE

Use a high-level IDE for development. The targeted IDE must support **debugging** and **linters**.
Also good integrations with **Version Control System**s are so welcome.

JetBrains's [WebStorm](https://www.jetbrains.com/webstorm/download/ "WebStorm Download Page") is
suggested for this purpose. (could be found in Ubuntu Software)

### Setup Prettier and Linter
Add prettier and eslint support plugins to your IDE. The project uses AirBnB coding style as main
syntactic standard. Any code blocks, added to repository must follows these standards.

## Consumed Libraries

Following libraries was used for developing project. Each dependency must be investigated for 
best practices and preferred usage, leading to incremental improvements in code quality.

* **Hapi.js**

  [Hapi Framework](https://hapi.dev/) is used for developing server side applications in Node.js.
  > Components in `routers/` and `controllers/` directory are respectively Hapi routes and handlers.

* **Mongoose.js**
  
  [Mongoose ODM](https://mongoosejs.com/) is used to make JS classes communicate with MongoDB,
  separating data-level concerns.js.
  > Components in `models/` directory are Mongoose models.

## Data Manipulation Scripts

Place data manipulation scripts under `node_scripts/`. Notice compatibility issues throughout 
project.
                                                                                                                                                           
##  Branching

Develop each patch to repository in a separate branch. Keep commit messages descriptive, brief on
first line and adequately explained in follow.

### Merge Request Process

1. Make sure final state of project in source is working, simultaneously compatible with AVL 
   GPS devices.
2. Update the [CHANGELOG.md](CHANGELOG.md) with details of changes to the interface.
3. Assign the Merge Request to another reviewer, as far as possible, to merge it for you.
