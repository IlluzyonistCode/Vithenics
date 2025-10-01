import React, { useState, useEffect } from 'react';
import { TrendingUp, Target, Calendar, Award, BarChart3, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress as ProgressBar } from '../components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import api from '../lib/api';

const Progress = () => {
  const [userProgress, setUserProgress] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('month');
  const [progressType, setProgressType] = useState('all');

  useEffect(() => {
    fetchUserProgress();
    fetchAchievements();
    fetchStatistics();
  }, [timeframe, progressType]);

  const fetchUserProgress = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();

      if (progressType !== 'all') params.append('type', progressType);
      
      const response = await api.get(`/progress/user?${params.toString()}`);

      setUserProgress(response.data.progress);
    } catch (error) {
      console.error('Failed to fetch user progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAchievements = async () => {
    try {
      const response = await api.get('/progress/achievements');

      setAchievements(response.data.achievements);
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await api.get(`/progress/stats?timeframe=${timeframe}`);
      
      setStatistics(response.data.statistics);
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    }
  };

  const updateProgress = async (progressId, newLevel) => {
    try {
      await api.put(`/progress/${progressId}`, { currentLevel: newLevel });

      fetchUserProgress();
    } catch (error) {
      console.error('Failed to update progress:', error);
    }
  };

  const getProgressPercentage = (current, target) => {
    if (!target || target === 0) return 0;

    return Math.min((current / target) * 100, 100);
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 80) return 'text-green-600';

    if (percentage >= 50) return 'text-yellow-600';

    return 'text-red-600';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading && !userProgress.length)
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
        <h1 className='text-3xl font-bold text-gray-900'>My Progress</h1>
        <div className='flex items-center gap-4'>
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className='w-40'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='week'>Week</SelectItem>
              <SelectItem value='month'>Month</SelectItem>
              <SelectItem value='quarter'>Quarter</SelectItem>
              <SelectItem value='year'>Year</SelectItem>
            </SelectContent>
          </Select>
          <Select value={progressType} onValueChange={setProgressType}>
            <SelectTrigger className='w-40'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>All</SelectItem>
              <SelectItem value='skill'>Skills</SelectItem>
              <SelectItem value='exercise'>Exercises</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {statistics && (
        <div className='grid grid-cols-1 md:grid-cols-4 gap-6 mb-8'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Active Goals</CardTitle>
              <Target className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{statistics.activeGoals || 0}</div>
              <p className='text-xs text-muted-foreground'>
                +{statistics.newGoalsThisMonth || 0} this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Completed</CardTitle>
              <Award className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{statistics.completedGoals || 0}</div>
              <p className='text-xs text-muted-foreground'>
                +{statistics.completedThisMonth || 0} this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Average Progress</CardTitle>
              <BarChart3 className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{statistics.averageProgress || 0}%</div>
              <p className='text-xs text-muted-foreground'>
                {statistics.progressTrend > 0 ? '+' : ''}{statistics.progressTrend || 0}% this period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>Achievements</CardTitle>
              <Activity className='h-4 w-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{achievements.length}</div>
              <p className='text-xs text-muted-foreground'>
                Total earned
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
        <div className='lg:col-span-2'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center'>
                <TrendingUp className='h-5 w-5 mr-2' />
                Current Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-6'>
                {userProgress.length === 0 ? (
                  <div className='text-center py-8'>
                    <Target className='h-12 w-12 text-gray-400 mx-auto mb-4' />
                    <h3 className='text-lg font-medium text-gray-900 mb-2'>
                      No Active Progress
                    </h3>
                    <p className='text-gray-500'>
                      Start training to track your progress
                    </p>
                  </div>
                ) : (
                  userProgress.map((progress) => {
                    const percentage = getProgressPercentage(
                      progress.currentLevel,
                      progress.maxReps || progress.maxHoldTime || 100
                    );
                    
                    return (
                      <div key={progress.id} className='border rounded-lg p-4'>
                        <div className='flex justify-between items-start mb-3'>
                          <div>
                            <h4 className='font-medium text-gray-900'>
                              {progress.skillName || progress.exerciseName || 'Unknown'}
                            </h4>
                            <Badge variant='outline' className='mt-1'>
                              {progress.progressType === 'skill' ? 'Skill' : 'Exercise'}
                            </Badge>
                          </div>
                          <div className='text-right'>
                            <div className={`text-lg font-bold ${getProgressColor(percentage)}`}>
                              {percentage.toFixed(0)}%
                            </div>
                            <div className='text-sm text-gray-500'>
                              {progress.currentLevel} / {progress.maxReps || progress.maxHoldTime || 100}
                            </div>
                          </div>
                        </div>
                        
                        <ProgressBar value={percentage} className='mb-3' />
                        
                        {progress.personalBest && (
                          <div className='text-sm text-gray-600 mb-2'>
                            <strong>Personal Best:</strong> {JSON.stringify(progress.personalBest)}
                          </div>
                        )}
                        
                        {progress.notes && (
                          <div className='text-sm text-gray-600 mb-3'>
                            <strong>Notes:</strong> {progress.notes}
                          </div>
                        )}
                        
                        <div className='flex gap-2'>
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() => updateProgress(progress.id, progress.currentLevel + 1)}
                          >
                            +1 Level
                          </Button>
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() => updateProgress(progress.id, Math.max(0, progress.currentLevel - 1))}
                          >
                            -1 Level
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center'>
                <Award className='h-5 w-5 mr-2' />
                Achievements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {achievements.length === 0 ? (
                  <div className='text-center py-4'>
                    <Award className='h-8 w-8 text-gray-400 mx-auto mb-2' />
                    <p className='text-gray-500 text-sm'>
                      No achievements yet
                    </p>
                  </div>
                ) : (
                  achievements.map((achievement) => (
                    <div key={achievement.id} className='border rounded-lg p-3'>
                      <div className='flex items-start gap-3'>
                        <div className='w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center'>
                          <Award className='h-4 w-4 text-yellow-600' />
                        </div>
                        <div className='flex-1'>
                          <h4 className='font-medium text-gray-900 text-sm'>
                            {achievement.achievementName}
                          </h4>
                          <p className='text-xs text-gray-600 mt-1'>
                            {achievement.description}
                          </p>
                          <p className='text-xs text-gray-400 mt-2'>
                            {formatDate(achievement.earnedAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className='mt-6'>
            <CardHeader>
              <CardTitle className='flex items-center'>
                <Calendar className='h-5 w-5 mr-2' />
                Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-3'>
                <div className='flex justify-between items-center'>
                  <span className='text-sm text-gray-600'>Streak Days</span>
                  <span className='font-medium'>{statistics?.streakDays || 0}</span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-sm text-gray-600'>Workouts per week</span>
                  <span className='font-medium'>{statistics?.weeklyWorkouts || 0}</span>
                </div>
                <div className='flex justify-between items-center'>
                  <span className='text-sm text-gray-600'>Total Time</span>
                  <span className='font-medium'>{statistics?.totalHours || 0}h</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Progress;
