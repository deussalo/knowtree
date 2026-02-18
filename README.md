# Knowtree 

Turn your coding agent into a private tutor. Generate knowledge dependency trees (like a video game skill tree) for any subject. 


Knowtree a webapp interface between you and an AI-Agent-Tutor. You could use other coding agents but I haven't tried. It is very much in alpha. I am going to keep developing this for myself and hopefully a full-blown developer will make a full-blown program with the concept.

https://github.com/user-attachments/assets/760c5b35-d2c0-446c-a31a-bc1ffa5e8b9f


https://github.com/user-attachments/assets/a3517521-f8e4-49a3-94c1-c387ffff9d3b

<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/4c2051b1-49a8-46bf-973f-d1194357f5f9" />


<img width="1917" height="1079" alt="image" src="https://github.com/user-attachments/assets/993fcbd8-604d-4efe-9b01-e90bcec2268d" />


## Overview

This project sets up a interface between a webapp(js), server(go) and AI Agent(claude code) who all share the project directory. Using the /tutor command initilizes the claude agent. 
You can ask the agent to generate a graph for any subject; specifying scope, depth, number of nodes within the graph and what your end goal is. For example: 

"I want to learn how to write my own CLI program in C, build me a knowledge graph which will guide me there. I am an absolute begginer with some bash knowledge. Make it no more than 25 nodes."

"I want to learn aerodynamics, but just enough to build and fly my own kites. 10 nodes."

"Create a 80 node graph detailing the evolution of Large Language models, starting at the earliest itterations and progressing forward to present time" (This will use a few tokens)

Once the graph is created you can navigate it's nodes. By default only the root node is available, further nodes must have all their prerequisite nodes completed before becoming available. This can be overridden of course if you wish to skip.

A node is a topic consisting of a linear sequence of subtopics as a guide. You enter a classroom for each node and are taught via a Socratic method approach where you are guided via a series of questions and clarifications. This discourse is the meat of the "learning". After all subtopics are covered there is a 20 Question test. You must score 90%+ to pass and complete the node, otherwise your results will inform the focus of a review, reclarifying misunderstandings until you pass. The classroom displays a markdown "chalkboard" where the tutor will put visual aids, code blocks, mermaid diagrams, expressions and there is a a plotly.js integration to display complex number plane and other graphs.

## Installation

I've included the js libraries used.

Clone this repo.

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

Explore the 'Knowtree-Tutorial' graph for more info.

Ask claude to generate new graphs.

To enter a clasroom navigate to an available node and press enter classroom. Then let claude know "I'm ready to start" or "I have selected a new node, begin"
- Large graphs will take a while to generate. The agent may even create a batch script when asked to create 100+ node graphs. I plan to specify a discrete large graph script for this in future.

## Tips

- If you don't like the way the tutor is teaching then provide feedback and/or edit .claude/commands/tutor. Teaching style is personal preference.

- There is a also a specialist_style.md per graph that can be edited.

- Clear or compact context frequently.

- Sonnett 4.5 is fine for this task. You can experiment switching models and using other agents besides Claude.
  
- Keep graphs under 100 nodes. Large graphs will take a while to generate or not work at all. I plan to specify a discrete large graph script for this in future. 
  
- Enter plan mode when requesting a graph or specify the AskUserQuestion tool to ensure a good specification.

- I have tried to optimise token use as best as I can but unavoidably the best solution I could find was rather verbose prompt window. Besides long conversation and large graph generation the tutoring doesn't normally use too many tokens as it is spaced out over time.

- Ask claude for sources and references you can even specify to use a certain source if you like.


## Disclaimer

This isn't going to make you a super genius and it has all the same limitations of AI.
I don't consider this tool tool a replacement for actual learning, which I see as something that happens during practical application.
This is more of a way of scaffolding understanding of new concepts so you can go and do the actual learning and make mental models and bridge concepts and fill in blank spots.

## Future Plans

Will see what tools become available from providers and how that may change the webapp/agent interaction. Keen to hear people's thoughts.

I would like to add FSRS (Free Spaced Repition Scheduler) to do reviews on previously completed nodes.

Nested graphs would be a cool idea to explore. The idea is the same as current graph gen but starting at a meta level and just generating broad headings.

You would only need to lazy load and generate descending levels on demand when a node is opened.

Here is an example:

  
- Layer 1 (Computer Science): What is CS?
    - Nodes: Algorithms, Data Structures, Theory, AI, Systems, etc.
  - Layer 2 (AI): Intelligent machines
    - Nodes: Machine Learning, Symbolic AI, Robotics, Natural Language, Vision, etc.
  - Layer 3 (Machine Learning): Learning from data
    - Nodes: Supervised Learning, Unsupervised, Reinforcement, Classification, Regression,
  etc.
  - Layer 4 (Deep Learning): Learning with multiple layers
    - Nodes: Neural Networks, CNNs, RNNs, Transformers, Autoencoders, etc.
  - Layer 5 (Neural Networks): Artificial neurons connected in layers
    - Nodes: Perceptron, Activation Functions, Layers, Forward Pass, Loss Functions, etc.
  - Layer 6 (Backpropagation): How networks learn from error
    - Nodes: Error Calculation, Weight Updates, Reverse Pass, Computational Graph, etc.
  - Layer 7 (Gradient Descent): The optimization algorithm
    - Nodes: Learning Rate, Momentum, Variants (SGD, Adam), Convergence, Local Minima, etc.
  - Layer 8 (Calculus of Optimization): Math of finding minima
    - Nodes: Critical Points, Second Derivatives, Convexity, Hessian Matrix, etc.
  - Layer 9 (Partial Derivatives): Rates of change in multiple dimensions
    - Nodes: Notation, Computation, Interpretation, Applications, etc.
  - Layer 10 (The Chain Rule): How to differentiate composite functions
    - Nodes: Two-Variable Chain Rule, Multivariable Extension, Jacobian, Proof, etc.


## Similar work:

I have had this idea in my head since using Khan Academy in High School. I was failing maths and was convinced I was a moron.
My older brother forced me to do Khan Academy and it had an awesome "constellation" mathematics knowledge depency graph and a review scheduler.
I filled in my knowledge gaps and beyond and jumped to grades within a year. Turns out I actually enjoyed mathematics and I just needed to fill in the blanks.
I wanted this same learning experience for every/any subject.

I found this repo from Erik Bjare last updated 8 years ago describing these ideas and other similiar projects
https://github.com/ErikBjare/KnowTree

If anyone else knows of similiar, that isn't just a corporate LMS, I would love to know.


## Vibe Code Disclaimer:

This is heavily vibecoded. I worked out the entire structure on paper over the course of two weeks and some chats with clever friends.
But once the plan was on paper I wanted to make it real. Being a father, business owner and non-programmer -- that probably would never have happened. So despite my reservations about vibecoding I appreciate the fact that someone like me can test out ideas and make them real with only a spare 10 minutes here or there. I would love for some serious engineers to make this a fully fledged program. Or perhaps I will use the program to help make me become a 'serious engineer' and do it myself!


