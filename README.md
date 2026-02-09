# Knowtree 

Turn your coding agent into a private tutor. Generate knowledge dependency trees (like a video game skill tree) for any subject. 


Knowtree is a plugin/mod/harness that I have built with and for Claude Code. You could use other coding agents but I haven't had much success. It is very much in alpha.

## Overview
---

This project sets up a interface between a webapp, server and Claude Agent who all share the project directory. Using the /tutor command initilizes the claude agent. 
You can ask to generate a graph for any subject you want specifying, scope, depth, number of nodes within the graph and what your end goal is. For example 

"I want to learn how to write my own CLI program in C, build me a knowledge graph which will guide me there. I am an absolute begginer with some bash knowledge. Make it no more than 25 nodes."

"I want to learn aerodynamics, but just enough to build and fly my own kites. 10 nodes."

"Create a 100 node graph detailing the evolution of Large Language models, starting at the earliest itterations and progressing forward to present time" (This will use a few tokens)

Once the graph is created you can navigate it's nodes. By default only the root node is available, further nodes must have all their prerequisite nodes completed before becoming available. This can be overided of course if you wish to skip.

A node is a topic consisting of a linear sequence of subtopics. You enter a classroom for each node and are taught via a Socratic method approach, that is you are guided via a series of questions and clarifications. This discourse is the meat of the "learning". After all subtopics are covered there is a 20 Question test. You must score 90%+ to pass and complete the node, otherwise your results will inform a what needs to be revised or adress misunderstandings you have shown. The classroom displays a markdown "chalkboard" where the tutor will put visual aids, code blocks, mermaid diagrams, expressions and there is a a plotly.js integration to display complex number plane and other graphs.

## Installation
---

Fork/Clone this repo.

Build the server with

```
go build ./server/main.go
```
then run with
```
go run server/main.go
```
which hosts the webapp at localhost:3000 by default

Or you can use

```
go run server/main.go --port ####
```
To specify port but will need to update claude's prompts.

cd and start claude
Use the /tutor command

Explore the Knowtree-Tutorial graph for more info.

Ask claude to generate new graphs.

To enter a clasroom navigate to an available node and press enter classroom. Then let claude know "I'm ready to start" or "I have selected a new node, begin"


## Tips

If you don't like the way the tutor is teaching then provide feedback and/or edit .claude/commands/tutor. Teaching style is personal preference.

Clear or compact context frequently.

I have tried to optimise token use as best as I can. 

Large graphs will take a while to generate. Claude may even create a script to batch it. I plan to specify a discrete large graph script for this in future.

Ask claude for sources and references. 

## Disclaimer

This isn't going to make you a super genius and it has all the same limitations of AI. Hopefully you



