import React, { useState, useEffect } from 'react';
import { Play, Clock, Target, Search, Activity, Users, Dumbbell, Timer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { Badge } from '../components/ui/badge';
import MarkdownRenderer from '../components/MarkdownRenderer';
import api from '../lib/api';
import { toast } from 'sonner';

const Workouts = () => {
  const [workouts, setWorkouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchWorkouts();
  }, []);

  const fetchWorkouts = async () => {
    try {
      setLoading(true);

      const response = await api.get('/workouts');

      setWorkouts(response.data.workouts);
    } catch (error) {
      console.error('Failed to fetch workouts:', error);

      toast.error('Could not load workouts.');
    } finally {
      setLoading(false);
    }
  };
  
  const startWorkout = async (workout, progression) => {
    try {
      const exercisesCompleted = (progression.plan ?? []).map((exercise, index) => ({
        exerciseId: exercise.id || index,
        name: exercise.name,
        completed: true,
        sets: exercise.set,
        reps: exercise.beat,
      }));

      const workoutData = {
        workoutId: workout.id,
        workoutName: `${workout.name} - ${progression.name}`,
        exercisesCompleted: exercisesCompleted,
        duration_minutes: workout.estimatedDuration || 30,
        notes: `Completed level: ${progression.name} on ${new Date().toLocaleString()}`
      };
      
      await api.post('/history/workouts', workoutData);

      toast.success(`'${progression.name}' completed and added to history!`);
    } catch (error) {
      console.error('Failed to start workout:', error);

      toast.error('Failed to log workout completion. Please try again.');
    }
  };

  const filteredWorkouts = workouts.filter(workout =>
    workout.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    workout.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDuration = (minutes) => {
    if (minutes === null || minutes === undefined) return '30m';

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const parseProgressions = (progressions) => {
    try {
      if (!progressions) return [];

      return typeof progressions === 'string' ? JSON.parse(progressions) : progressions;
    } catch {
      return [];
    }
  };

  const getDifficultyColor = (difficulty) => {
    if (!difficulty) return 'bg-gray-100 text-gray-800';

    const lower = difficulty.toLowerCase();

    if (lower.includes('beginner')) return 'bg-green-100 text-green-800';

    if (lower.includes('intermediate')) return 'bg-yellow-100 text-yellow-800';

    if (lower.includes('advanced') || lower.includes('pro')) return 'bg-red-100 text-red-800';

    return 'bg-blue-100 text-blue-800';
  };

  if (loading)
    return (
      <div className='container mx-auto px-4 py-8'>
        <div className='animate-pulse space-y-4'>
          <div className='h-8 bg-gray-200 rounded w-1/4'></div>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className='h-64 bg-gray-200 rounded'></div>
            ))}
          </div>
        </div>
      </div>
    );

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='flex justify-between items-center mb-8'>
        <h1 className='text-3xl font-bold text-gray-900'>Workouts</h1>
      </div>

      <div className='mb-6'>
        <div className='relative'>
          <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4' />
          <Input
            placeholder='Search workouts...'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='pl-10'
          />
        </div>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        {filteredWorkouts.length === 0 ? (
          <div className='col-span-full'>
            <Card>
              <CardContent className='flex flex-col items-center justify-center py-12'>
                <Target className='h-12 w-12 text-gray-400 mb-4' />
                <h3 className='text-lg font-medium text-gray-900 mb-2'>
                  {workouts.length === 0 ? 'No workouts available' : 'No workouts found'}
                </h3>
                <p className='text-gray-500 text-center mb-4'>
                  {workouts.length === 0
                    ? 'Check back later for new workouts.'
                    : 'Try a different search term.'
                  }
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          filteredWorkouts.map((workout) => {
            const progressions = parseProgressions(workout.progressions);
            
            return (
              <Dialog key={workout.id}>
                <DialogTrigger asChild>
                  <Card className='hover:shadow-md transition-shadow cursor-pointer flex flex-col'>
                    <CardHeader>
                      <div className='flex justify-between items-start'>
                        <CardTitle className='text-lg'>{workout.name}</CardTitle>
                        {workout.difficultyLevel && (
                          <Badge className={getDifficultyColor(workout.difficultyLevel)}>
                            {workout.difficultyLevel}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className='flex flex-col justify-between flex-grow'>
                      <div>
                        {workout.description && (
                        <div className='text-sm text-gray-600 line-clamp-3 mb-4'>
                          <MarkdownRenderer content={workout.description || 'No description available.'} />
                        </div>
                        )}
                        <div className='grid grid-cols-2 gap-2 mb-4'>
                          <div className='flex items-center text-xs text-gray-600 bg-gray-50 rounded-lg p-2'>
                            <Clock className='h-3 w-3 mr-1 text-blue-500' />
                            <span>{formatDuration(workout.estimatedDuration)}</span>
                          </div>
                          {(progressions?.length > 0) && (
                            <div className='flex items-center text-xs text-gray-600 bg-gray-50 rounded-lg p-2'>
                              <Target className='h-3 w-3 mr-1 text-green-500' />
                              <span>{progressions.length} levels</span>
                            </div>
                          )}
                          {workout.workoutType && (
                            <div className='flex items-center text-xs text-gray-600 bg-gray-50 rounded-lg p-2'>
                              <Activity className='h-3 w-3 mr-1 text-purple-500' />
                              <span className='capitalize'>{workout.workoutType}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <Button className='w-full mt-auto' size='sm'>
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                </DialogTrigger>
                
                <DialogContent className='sm:max-w-[700px] max-h-[80vh] overflow-y-auto'>
                  <DialogHeader>
                    <DialogTitle className='text-2xl'>{workout.name}</DialogTitle>
                    <DialogDescription>
                      <div className='flex flex-wrap gap-2 mt-2'>
                        {workout.difficultyLevel && (
                          <Badge className={getDifficultyColor(workout.difficultyLevel)}>
                            {workout.difficultyLevel}
                          </Badge>
                        )}
                        {workout.workoutType && (
                          <Badge variant='outline'>{workout.workoutType}</Badge>
                        )}
                        <Badge variant='outline'>
                          <Clock className='h-3 w-3 mr-1' />
                          {formatDuration(workout.estimatedDuration)}
                        </Badge>
                      </div>
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className='py-4'>
                    {workout.description && (
                      <div className='mb-6'>
                        <h3 className='font-semibold mb-2'>Description</h3>
                        <MarkdownRenderer content={workout.description} />
                      </div>
                    )}

                    {(progressions?.length > 0) && (
                      <div className='mb-6'>
                        <h3 className='font-semibold mb-4'>Workout Levels</h3>
                        <Accordion type='single' collapsible className='w-full'>
                          {progressions.map((progression, index) => (
                            <AccordionItem value={`level-${index}`} key={index}>
                              <AccordionTrigger>
                                <div className='flex items-center justify-between w-full pr-4'>
                                  <span>{progression.name} (Level {progression.level})</span>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                <div className='space-y-4'>
                                  {}
                                  {(progression.warmUp?.length > 0) && (
                                    <div>
                                      <h4 className='font-medium text-sm mb-2 flex items-center'>
                                        <Timer className='h-4 w-4 mr-1 text-orange-500' />
                                        Warm Up
                                      </h4>
                                      <div className='bg-orange-50 rounded-lg p-3 grid grid-cols-1 gap-1'>
                                        {progression.warmUp.map((exercise, exIndex) => (
                                          <div key={exIndex} className='flex justify-between text-sm'>
                                            <span>{exercise.name}</span>
                                            <span className='text-gray-600'>{exercise.beat} reps</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {}
                                  {(progression.plan?.length > 0) && (
                                    <div>
                                      <h4 className='font-medium text-sm mb-2 flex items-center'>
                                        <Dumbbell className='h-4 w-4 mr-1 text-blue-500' />
                                        Main Workout
                                      </h4>
                                      <div className='bg-blue-50 rounded-lg p-3 space-y-2'>
                                        {progression.plan.map((exercise, exIndex) => (
                                          <div key={exIndex} className='border-b border-blue-200 last:border-b-0 pb-2 last:pb-0'>
                                            <span className='font-medium text-sm'>{exercise.name}</span>
                                            <div className='text-xs text-gray-600 mt-1'>
                                              {exercise.set} sets × {exercise.beat} reps
                                              {exercise.pauseAfterSet && (
                                                <span className='ml-2'>• Rest: {exercise.pauseAfterSet}s</span>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  
                                  {}
                                  {(progression.stretching?.length > 0) && (
                                    <div>
                                      <h4 className='font-medium text-sm mb-2 flex items-center'>
                                        <Users className='h-4 w-4 mr-1 text-green-500' />
                                        Cool Down
                                      </h4>
                                      <div className='bg-green-50 rounded-lg p-3 grid grid-cols-1 gap-1'>
                                        {progression.stretching.map((exercise, exIndex) => (
                                          <div key={exIndex} className='flex justify-between text-sm'>
                                            <span>{exercise.name}</span>
                                            <span className='text-gray-600'>{exercise.beat}s</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {}
                                  <Button className='w-full mt-4' onClick={() => startWorkout(workout, progression)}>
                                    <Play className='h-4 w-4 mr-2' />
                                    Complete {progression.name}
                                  </Button>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            );
          })
        )}
      </div>

      {filteredWorkouts.length > 0 && (
        <div className='mt-8 text-center'>
          <p className='text-gray-500 text-sm'>
            Showing {filteredWorkouts.length} of {workouts.length} workouts
          </p>
        </div>
      )}
    </div>
  );
};

export default Workouts;
