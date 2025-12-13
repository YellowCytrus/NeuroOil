import { useEffect, useState, useRef } from 'react';
import { subscribeToTrainingProgress, TrainingProgress } from '../utils/api';

export function useTrainingProgress(taskId: string | null) {
  const [progress, setProgress] = useState<TrainingProgress | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!taskId) {
      return;
    }

    console.log('Subscribing to training progress for task:', taskId);
    
    const eventSource = subscribeToTrainingProgress(
      taskId,
      (newProgress) => {
        console.log('Received progress update:', newProgress);
        setProgress(newProgress);
        setError(null);
      },
      (err) => {
        console.error('SSE error:', err);
        setError(err);
        // Don't clear progress on error - keep last known state
      }
    );

    eventSourceRef.current = eventSource;

    return () => {
      console.log('Cleaning up SSE connection for task:', taskId);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [taskId]);

  return { progress, error };
}

