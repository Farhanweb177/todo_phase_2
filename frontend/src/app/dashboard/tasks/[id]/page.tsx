'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { getTaskById, updateTask, deleteTask, toggleTaskCompletion } from '@/services/tasks';
import { Task, UpdateTaskRequest, getErrorMessage } from '@/utils/types';
import TaskForm from '@/components/TaskForm';

export default function TaskDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const taskId = params.id as string;

  // Route protection
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/signin');
    }
  }, [isAuthenticated, authLoading, router]);

  const fetchTask = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getTaskById(taskId);
      setTask(data);
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'status' in err && (err as { status: number }).status === 404) {
        setError('Task not found.');
      } else {
        setError(getErrorMessage(err, 'Failed to load task.'));
      }
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  // Fetch task
  useEffect(() => {
    if (isAuthenticated && taskId) {
      fetchTask();
    }
  }, [isAuthenticated, taskId, fetchTask]);

  // Auto-dismiss success
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleUpdate = async (data: UpdateTaskRequest) => {
    await updateTask(taskId, data);
    setIsEditing(false);
    setSuccessMessage('Task updated successfully!');
    await fetchTask();
  };

  const handleToggle = async () => {
    try {
      await toggleTaskCompletion(taskId);
      setSuccessMessage('Task status updated!');
      await fetchTask();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to toggle task.'));
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await deleteTask(taskId);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to delete task.'));
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (authLoading || (!isAuthenticated && !error)) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
        <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center text-sm text-gray-500 hover:text-primary mb-6 transition-colors"
      >
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Dashboard
      </Link>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 rounded-md bg-green-50 border border-green-200 p-4">
          <p className="text-sm text-green-800">{successMessage}</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">{error}</h3>
          <Link href="/dashboard" className="mt-4 inline-block text-primary hover:text-primary/80 text-sm font-medium">
            Return to Dashboard
          </Link>
        </div>
      )}

      {/* Loading */}
      {loading && !error && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <svg className="animate-spin h-10 w-10 text-primary mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-gray-600">Loading task...</p>
        </div>
      )}

      {/* Task Detail */}
      {task && !loading && !error && (
        <>
          {isEditing ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <TaskForm
                task={task}
                onSubmit={handleUpdate}
                onCancel={() => setIsEditing(false)}
                isEditing
              />
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {/* Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          task.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {task.status === 'completed' ? 'Completed' : 'Pending'}
                      </span>
                    </div>
                    <h1 className={`text-2xl font-bold ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                      {task.title}
                    </h1>
                  </div>
                </div>
              </div>

              {/* Description */}
              {task.description && (
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-sm font-medium text-gray-500 mb-2">Description</h2>
                  <p className={`text-gray-700 whitespace-pre-wrap ${task.status === 'completed' ? 'text-gray-400' : ''}`}>
                    {task.description}
                  </p>
                </div>
              )}

              {/* Metadata */}
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-sm font-medium text-gray-500 mb-3">Details</h2>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Created</dt>
                    <dd className="text-gray-900">{formatDate(task.createdAt)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Last Updated</dt>
                    <dd className="text-gray-900">{formatDate(task.updatedAt)}</dd>
                  </div>
                  {task.completedAt && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Completed</dt>
                      <dd className="text-gray-900">{formatDate(task.completedAt)}</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Actions */}
              <div className="p-6 flex flex-wrap gap-3">
                <button
                  onClick={handleToggle}
                  className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md border transition-colors ${
                    task.status === 'completed'
                      ? 'border-yellow-300 text-yellow-700 bg-yellow-50 hover:bg-yellow-100'
                      : 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'
                  }`}
                >
                  {task.status === 'completed' ? 'Mark as Pending' : 'Mark as Completed'}
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  Edit Task
                </button>
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-danger bg-white border border-red-300 rounded-md hover:bg-red-50 transition-colors"
                >
                  Delete Task
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
