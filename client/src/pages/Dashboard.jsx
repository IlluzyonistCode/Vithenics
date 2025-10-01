import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { progressAPI, historyAPI } from '../lib/api';
import {
    Activity,
    Award,
    ChevronRight,
    Clock,
    Target
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [recentWorkouts, setRecentWorkouts] = useState([]);
    const [achievements, setAchievements] = useState([]);
    const [loading, setLoading] = useState(true);

    const { user } = useAuth();

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [progressResponse, historyResponse, achievementsResponse] = await Promise.all([
                    progressAPI.getSummary(),
                    historyAPI.getWorkoutHistory({ limit: 5 }),
                    progressAPI.getAchievements()
                ]);

                const summary = progressResponse.data.summary;

                setStats({
                    totalWorkouts: summary.workouts?.total || 0,
                    totalWorkoutTime: summary.workouts?.totalDuration || 0,
                    skillsInProgress: summary.skills,
                    achievementsEarned: summary.recentAchievements?.length || 0
                });

                setRecentWorkouts(historyResponse.data.workoutHistory);
                setAchievements(achievementsResponse.data.achievements);
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const formatDate = (dateString) => {
        if (!dateString) return '';

        return new Date(dateString).toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };
    
    const formatDuration = (minutes) => {
        const totalMinutes = minutes || 0;
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;

        return `${hours}h ${mins}m`;
    };

    if (loading)
        return (
            <div className='flex items-center justify-center h-64'>
                <div className='animate-spin rounded-full h-32 w-32 border-b-2 border-black'></div>
            </div>
        );

    const statCards = [
        { name: 'Total Workouts', value: stats?.totalWorkouts || 0, icon: Activity, color: 'bg-black' },
        { name: 'Total Time', value: formatDuration(stats?.totalWorkoutTime), icon: Clock, color: 'bg-green-500' },
        { name: 'Skills in Progress', value: stats?.skillsInProgress || 0, icon: Target, color: 'bg-purple-500' },
        { name: 'Achievements', value: stats?.achievementsEarned || 0, icon: Award, color: 'bg-yellow-500' }
    ];

    return (
        <div className='space-y-6'>
            <div className='bg-gradient-to-r from-black to-purple-600 rounded-lg p-6 text-white'>
                <h1 className='text-2xl font-bold mb-2'>
                    Welcome back, {user?.firstName || 'Athlete'}!
                </h1>
                <p className='text-white'>
                    Ready to continue your calisthenics journey? Let's make today a productive one.
                </p>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6'>
                {statCards.map((stat) => {
                    const Icon = stat.icon;

                    return (
                        <div key={stat.name} className='bg-white rounded-lg p-6 shadow-sm border border-gray-200'>
                            <div className='flex items-center'>
                                <div className={`${stat.color} rounded-lg p-3`}>
                                    <Icon className='h-6 w-6 text-white' />
                                </div>
                                <div className='ml-4'>
                                    <p className='text-sm font-medium text-gray-600'>{stat.name}</p>
                                    <p className='text-2xl font-semibold text-gray-900'>{stat.value}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                <Card>
                    <CardHeader className='flex flex-row items-center justify-between'>
                        <CardTitle>Recent Workouts</CardTitle>
                        <Link to='/history' className='text-black hover:text-gray-500 text-sm font-medium flex items-center'>
                            View All
                            <ChevronRight className='ml-1 h-4 w-4' />
                        </Link>
                    </CardHeader>
                    <CardContent>
                        {recentWorkouts.length > 0 ? (
                            <div className='space-y-3'>
                                {recentWorkouts.map((workout) => (
                                    <div key={workout.id} className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
                                        <div>
                                            <p className='font-medium text-gray-900'>{workout.workoutName}</p>
                                            <p className='text-sm text-gray-500'>{formatDate(workout.completedAt)}</p>
                                        </div>
                                        <div className='text-right'>
                                            <p className='text-sm font-medium text-gray-900'>{workout.duration} min</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className='text-center py-8'>
                                <Activity className='mx-auto h-12 w-12 text-gray-400' />
                                <p className='mt-2 text-sm text-gray-500'>You haven't completed any workouts yet</p>
                                <Link to='/workouts' className='mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800'>
                                    Start Your First Workout
                                </Link>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className='flex items-center'>
                            <Award className='h-5 w-5 mr-2' />
                            Achievements
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className='space-y-4'>
                            {achievements.length > 0 ? (
                                achievements.slice(0, 5).map((achievement) => (
                                    <div key={achievement.id} className='flex items-start gap-3'>
                                        <div className='w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0'>
                                            <Award className='h-4 w-4 text-yellow-600' />
                                        </div>
                                        <div className='flex-1'>
                                            <h4 className='font-medium text-gray-900 text-sm'>{achievement.achievementName}</h4>
                                            <p className='text-xs text-gray-600 mt-1'>{achievement.description}</p>
                                            <p className='text-xs text-gray-400 mt-2'>{formatDate(achievement.earnedAt)}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className='text-center py-4'>
                                    <Award className='h-8 w-8 text-gray-400 mx-auto mb-2' />
                                    <p className='text-gray-500 text-sm'>You have no achievements yet</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default Dashboard;
