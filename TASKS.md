# Task Management (To-Do) Feature - Implementation Tasks

## Database Setup
- [x] Create tasks table in Supabase
- [x] Create task_assignees table for multiple assignees
- [x] Create task_comments table
- [x] Create task_attachments table
- [x] Add RLS policies for all task tables
- [x] Create stored procedures for task operations

## Backend/Hooks
- [x] Create useTask hook for single task
- [x] Create useTasks hook for task list
- [x] Create useCreateTask mutation
- [x] Create useUpdateTask mutation
- [x] Create useDeleteTask mutation
- [x] Create useTaskComments hook
- [x] Add exports to packages/supabase/src/index.ts

## UI Components
- [x] Create TaskCard component
- [x] Create TaskList component
- [x] Create TaskDetail component (modal/sidebar)
- [x] Create TaskForm component (create/edit)
- [x] Create TaskFilters component
- [x] Create TaskComments component

## Pages & Navigation
- [x] Add "Taken" item to sidebar navigation
- [x] Create /taken page
- [x] Create /taken/mijn page (my tasks)
- [x] Create /taken/team page (team tasks)
- [x] Create /taken/voltooid page (completed tasks)

## Features
- [x] Implement task creation
- [x] Implement task editing
- [x] Implement task deletion
- [x] Implement task status updates (todo, in_progress, done)
- [x] Implement task assignment
- [x] Implement due date functionality
- [x] Implement priority levels
- [x] Implement task comments
- [x] Implement task filtering and sorting
- [x] Implement task search

## Integration
- [x] Link tasks to tickets (optional relation)
- [x] Add task creation from ticket detail page
- [x] Show related tasks in ticket detail
- [x] Add task notifications to sidebar counts

## Testing & Polish
- [x] Add sample task data
- [ ] Test all CRUD operations
- [ ] Test filtering and sorting
- [ ] Add loading states
- [ ] Add error handling
