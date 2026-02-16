'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { getTasks, createTask, updateTask, deleteTask, toggleTaskCompletion } from '@/services/tasks';
import { Task, TaskFilter, CreateTaskRequest, UpdateTaskRequest, getErrorMessage } from '@/utils/types';
import TaskList from '@/components/TaskList';
import TaskForm from '@/components/TaskForm';

type FilterStatus = 'all' | 'pending' | 'completed';

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading, user } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [successMessage, setSuccessMessage] = useState('');

  // Create/Edit modal state
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Delete confirmation state
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  // Route protection
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/signin');
    }
  }, [isAuthenticated, authLoading, router]);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const filters: TaskFilter = {};

      if (filterStatus === 'pending') {
        filters.status = 'pending';
      } else if (filterStatus === 'completed') {
        filters.status = 'completed';
      }

      const response = await getTasks(filters);
      setTasks(response.tasks);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to fetch tasks. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  // Fetch tasks on mount and when filter changes
  useEffect(() => {
    if (isAuthenticated) {
      fetchTasks();
    }
  }, [isAuthenticated, fetchTasks]);

  // Auto-dismiss success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleFilterChange = (status: FilterStatus) => {
    setFilterStatus(status);
  };

  // T063: Handle task creation
  const handleCreateTask = async (data: CreateTaskRequest | UpdateTaskRequest) => {
    await createTask(data as CreateTaskRequest);
    setShowForm(false);
    setSuccessMessage('Task created successfully!');
    await fetchTasks();
  };

  // T068: Handle task update
  const handleUpdateTask = async (data: CreateTaskRequest | UpdateTaskRequest) => {
    if (!editingTask) return;
    await updateTask(editingTask.id, data as UpdateTaskRequest);
    setEditingTask(null);
    setShowForm(false);
    setSuccessMessage('Task updated successfully!');
    await fetchTasks();
  };

  // Toggle task completion
  const handleToggle = async (id: string) => {
    try {
      await toggleTaskCompletion(id);
      await fetchTasks();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to update task.'));
    }
  };

  // Open edit form
  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setShowForm(true);
  };

  // Delete task
  const handleDelete = async (id: string) => {
    setDeletingTaskId(id);
  };

  const confirmDelete = async () => {
    if (!deletingTaskId) return;
    try {
      await deleteTask(deletingTaskId);
      setDeletingTaskId(null);
      setSuccessMessage('Task deleted successfully!');
      await fetchTasks();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to delete task.'));
      setDeletingTaskId(null);
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingTask(null);
  };

  // Auth loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <div className="text-center">
          <svg className="animate-spin h-10 w-10 text-primary mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {user?.firstName ? `Welcome, ${user.firstName}!` : 'My Dashboard'}
          </h1>
          <p className="mt-2 text-gray-600">
            Manage your tasks and stay organized
          </p>
        </div>

        {/* T061: Create Task button */}
        <button
          onClick={() => { setEditingTask(null); setShowForm(true); }}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-primary/90 shadow-sm transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create Task
        </button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 rounded-md bg-green-50 border border-green-200 p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-green-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="ml-3 text-sm text-green-800">{successMessage}</p>
          </div>
        </div>
      )}

      {/* T062: Create/Edit Task Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={cancelForm}></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-auto p-6 z-10">
              <TaskForm
                task={editingTask}
                onSubmit={editingTask ? handleUpdateTask : handleCreateTask}
                onCancel={cancelForm}
                isEditing={!!editingTask}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingTaskId && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setDeletingTaskId(null)}></div>
            <div className="relative bg-white rounded-lg shadow-xl max-w-sm w-full mx-auto p-6 z-10">
              <h3 className="text-lg font-semibold text-gray-900">Delete Task</h3>
              <p className="mt-2 text-sm text-gray-600">
                Are you sure you want to delete this task? This action cannot be undone.
              </p>
              <div className="mt-4 flex justify-end gap-3">
                <button
                  onClick={() => setDeletingTaskId(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-danger border border-transparent rounded-md hover:bg-danger/90"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Stats Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Filter:</span>
            <div className="flex gap-2">
              <button
                onClick={() => handleFilterChange('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filterStatus === 'all'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => handleFilterChange('pending')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filterStatus === 'pending'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => handleFilterChange('completed')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  filterStatus === 'completed'
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Completed
              </button>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            <span className="font-medium">{tasks.length}</span> {tasks.length === 1 ? 'task' : 'tasks'}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 rounded-md bg-red-50 border border-red-200 p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="ml-3 text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12">
          <div className="text-center">
            <svg className="animate-spin h-10 w-10 text-primary mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-4 text-gray-600">Loading tasks...</p>
          </div>
        </div>
      ) : (
        <TaskList
          tasks={tasks}
          onToggle={handleToggle}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCreateTask={() => { setEditingTask(null); setShowForm(true); }}
        />
      )}
    </div>
  );
}
