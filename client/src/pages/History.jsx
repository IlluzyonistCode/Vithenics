import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Flame, TrendingUp, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { parseJsonArray } from '../utils/jsonHelpers';
import api from '../lib/api';

const History = () => {
  const [workoutHistory, setWorkoutHistory] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('month');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    fetchWorkoutHistory();
    fetchStatistics();
  }, [page, period]);

  const fetchWorkoutHistory = async () => {
    try {
      setLoading(true);

      const response = await api.get(`/history/workouts?page=${page}&limit=10`);
      
      setWorkoutHistory(response.data.workoutHistory);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Failed to fetch workout history:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await api.get(`/history/stats?period=${period}`);

      setStatistics(response.data.statistics);
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    }
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && !workoutHistory.length)
    return (
      <div className='container mx-auto px-4 py-8'>
        <div className='animate-pulse space-y-4'>
          <div className='h-8 bg-gray-200 rounded w-1/4'></div>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            {[1, 2, 3].map((i) => (
              <div key={i} className='h-32 bg-gray-200 rounded'></div>
            ))}
          </div>
        </div>
      </div>
    );

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='flex justify-between items-center mb-8'>
        <h1 className='text-3xl font-bold text-gray-900'>Workout History</h1>
        <div className='flex items-center gap-4'>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className='w-40'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='week'>Week</SelectItem>
              <SelectItem value='month'>Month</SelectItem>
              <SelectItem value='quarter'>Quarter</SelectItem>
              <SelectItem value='year'>Year</SelectItem>
              <SelectItem value='all'>All time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {statistics && (
        <div className='grid grid-cols-1 md:grid-cols-4 gap-6 mb-8'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Total Workouts</CardTitle>
              <TrendingUp className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{statistics.totalWorkouts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Total Time</CardTitle>
              <Clock className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{formatDuration(statistics.totalDuration)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Average Time</CardTitle>
              <Clock className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{formatDuration(statistics.averageDuration)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className='space-y-4'>
        {workoutHistory && workoutHistory.length === 0 ? (
          <Card>
            <CardContent className='flex flex-col items-center justify-center py-12'>
              <Calendar className='h-12 w-12 text-gray-400 mb-4' />
              <h3 className='text-lg font-medium text-gray-900 mb-2'>No Workout History</h3>
              <p className='text-gray-500 text-center'>
                Start a workout to see your history here
              </p>
            </CardContent>
          </Card>
        ) : (
          workoutHistory && workoutHistory.map((workout) => (
            <Card key={workout.id} className='hover:shadow-md transition-shadow'>
              <CardContent className='p-6'>
                <div className='flex justify-between items-start mb-4'>
                  <div>
                    <h3 className='text-lg font-semibold text-gray-900 mb-1'>
                      {workout.workoutName}
                    </h3>
                    <p className='text-sm text-gray-500 flex items-center'>
                      <Calendar className='h-4 w-4 mr-1' />
                      {formatDate(workout.completedAt)}
                    </p>
                  </div>
                  <div className='flex gap-2'>
                    <Badge variant='secondary' className='flex items-center'>
                      <Clock className='h-3 w-3 mr-1' />
                      {formatDuration(workout.duration)}
                    </Badge>
                  </div>
                </div>

                {workout.exercisesCompleted && workout.exercisesCompleted.length > 0 && (
                  <div className='mb-4'>
                    <h4 className='text-sm font-medium text-gray-700 mb-2'>Exercises:</h4>
                    <div className='flex flex-wrap gap-2'>
                      {parseJsonArray(workout.exercisesCompleted).slice(0, 3).map((exercise, index) => (
                        <Badge key={index} variant='outline' className='text-xs'>
                          {exercise.exerciseName}
                        </Badge>
                      ))}
                      {parseJsonArray(workout.exercisesCompleted).length > 3 && (
                        <Badge variant='outline' className='text-xs'>
                          +{parseJsonArray(workout.exercisesCompleted).length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {workout.notes && (
                  <div className='mt-4 p-3 bg-gray-50 rounded-lg'>
                    <p className='text-sm text-gray-600'>{workout.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className='flex justify-center items-center gap-2 mt-8'>
          <Button
            variant='outline'
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className='text-sm text-gray-600'>
            Page {page} of {pagination.totalPages}
          </span>
          <Button
            variant='outline'
            onClick={() => setPage(page + 1)}
            disabled={page === pagination.totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};

export default History;
