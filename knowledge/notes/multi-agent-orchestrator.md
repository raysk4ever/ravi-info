---
title: Multi-Agent Orchestrator
type: project
tags: [ai, langgraph, agents, python]
---

# Multi-Agent Orchestrator

A LangGraph-based system that routes a request through several specialised
agents instead of sending everything to one model. Ravi built it to handle
support and research queries that need different tools and different context.

## How it works

The graph starts at a triage node that classifies the request, then routes to
one or more specialist nodes. Specialists can hand off to each other, and every
node reads and writes a shared memory keyspace so context survives a handoff.

- Conditional edges decide the next node from the triage classification.
- Each specialist exposes its own tool set, so a research agent never sees
  write tools it does not need.
- Shared memory means a follow-up question like "now summarise that" resolves
  against the previous turn without re-fetching.

## Why LangGraph

Plain LangChain chains cannot express cycles or conditional branching, and
supervisor patterns need hand-written routing. LangGraph models the whole thing
as a state machine, which made the routing explicit and testable.

## Stack

Python, LangGraph, LangChain, OpenAI, PostgreSQL for checkpointing.
