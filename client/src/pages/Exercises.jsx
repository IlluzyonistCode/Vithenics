import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter, Target, Zap, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Progress } from '../components/ui/progress';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { parseJsonArray } from '../utils/jsonHelpers';
import api from '../lib/api';
import { toast } from 'sonner';

const Exercises = () => {
    const [searchParams] = useSearchParams();
    const [exercises, setExercises] = useState([]);
    const [muscleGroups, setMuscleGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMuscleGroup, setSelectedMuscleGroup] = useState('all');
    const [selectedDifficulty, setSelectedDifficulty] = useState('all');
    const [selectedEquipment, setSelectedEquipment] = useState('all');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState(null);
    const [expandedCards, setExpandedCards] = useState({});
    const [highlightedExerciseId, setHighlightedExerciseId] = useState(null);

    const toggleCardExpansion = (exerciseId) => {
        setExpandedCards(prev => ({
            ...prev,
            [exerciseId]: !prev[exerciseId]
        }));
    };

    useEffect(() => {
        fetchMuscleGroups();
    }, []);

    useEffect(() => {
        const highlightId = searchParams.get('highlight');
        
        if (highlightId) {
            const findAndLoadHighlightedExercise = async () => {
                try {
                    const exerciseId = parseInt(highlightId);
                    
                    const params = new URLSearchParams();
                    params.append('limit', '1000');
                    
                    if (searchTerm) params.append('search', searchTerm);
                    if (selectedMuscleGroup !== 'all') params.append('muscleGroup', selectedMuscleGroup);
                    if (selectedDifficulty !== 'all') params.append('difficulty', selectedDifficulty);
                    if (selectedEquipment !== 'all') params.append('equipment', selectedEquipment);
                    
                    const allExercisesResponse = await api.get(`/exercises?${params.toString()}`);
                    const allExercises = allExercisesResponse.data.exercises || [];
                    
                    const exerciseIndex = allExercises.findIndex(ex => ex.id === exerciseId);
                    
                    if (exerciseIndex !== -1) {
                        const exercisesPerPage = 12;
                        const targetPage = Math.floor(exerciseIndex / exercisesPerPage) + 1;
                        
                        setPage(targetPage);
                        setHighlightedExerciseId(exerciseId);
                    } else {
                        console.error('Exercise not found with current filters');
                        fetchExercises();
                    }
                } catch (error) {
                    console.error('Failed to find highlighted exercise:', error);
                    fetchExercises();
                }
            };
            
            findAndLoadHighlightedExercise();
        } else {
            fetchExercises();
        }
    }, [searchParams, searchTerm, selectedMuscleGroup, selectedDifficulty, selectedEquipment]);

    useEffect(() => {
        const highlightId = searchParams.get('highlight');
        if (!highlightId) {
            const delayedSearch = setTimeout(() => {
                setPage(1);
                fetchExercises();
            }, 300);

            return () => clearTimeout(delayedSearch);
        }
    }, [searchTerm, selectedMuscleGroup, selectedDifficulty, selectedEquipment, searchParams]);

    useEffect(() => {
        fetchExercises();
    }, [page]);
    
    useEffect(() => {
        const highlightId = searchParams.get('highlight');
        if (highlightId && exercises.length > 0) {
            const exerciseId = parseInt(highlightId);
            const exerciseExists = exercises.find(ex => ex.id === exerciseId);
            
            if (exerciseExists) {
                setExpandedCards(prev => ({
                    ...prev,
                    [exerciseId]: true
                }));
                
                setTimeout(() => {
                    const element = document.getElementById(`exercise-${exerciseId}`);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 300);
            }
        }
    }, [exercises, searchParams]);

    const fetchExercises = async () => {
        try {
            setLoading(true);

            const params = new URLSearchParams();

            params.append('page', page.toString());
            params.append('limit', '12');
            
            if (searchTerm) params.append('search', searchTerm);

            if (selectedMuscleGroup !== 'all') params.append('muscleGroup', selectedMuscleGroup);
            
            if (selectedDifficulty !== 'all') params.append('difficulty', selectedDifficulty);
            
            if (selectedEquipment !== 'all') params.append('equipment', selectedEquipment);
            
            const response = await api.get(`/exercises?${params.toString()}`);

            setExercises(response.data.exercises);
            setPagination(response.data.pagination);
        } catch (error) {
            console.error('Failed to fetch exercises:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMuscleGroups = async () => {
        try {
            const response = await api.get('/exercises/categories/muscle-groups');
            
            setMuscleGroups(response.data.muscleGroups);
        } catch (error) {
            console.error('Failed to fetch muscle groups:', error);
        }
    };

    const updateExerciseProgress = async (exerciseId, progress) => {
        try {
            await api.put(`/exercises/${exerciseId}/progress`, { progress });
            
            const exercise = exercises.find(ex => ex.id === exerciseId);
            const exerciseName = exercise ? exercise.name : `Exercise ${exerciseId}`;
            
            const workoutData = {
                workoutName: `${exerciseName} - Single Exercise`,
                exercisesCompleted: [{ exerciseId, name: exerciseName, completed: true }],
                duration: 5, 
                notes: `Completed exercise: ${exerciseName}`
            };
            
            await api.post('/history/workouts', workoutData);
            
            toast.success(`Exercise '${exerciseName}' completed and added to history!`);
        } catch (error) {
            console.error('Failed to update exercise progress:', error);

            toast.error('Failed to complete exercise. Please try again.');
        }
    };

    const getDifficultyColor = (level) => {
        switch (level?.toLowerCase()) {
            case 'beginner':
                return 'bg-green-100 text-green-800';

            case 'intermediate':
                return 'bg-yellow-100 text-yellow-800';

            case 'advanced':
                return 'bg-red-100 text-red-800';

            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getDifficultyText = (level) => {
        switch (level?.toLowerCase()) {
            case 'beginner':
                return 'Beginner';

            case 'intermediate':
                return 'Intermediate';

            case 'advanced':
                return 'Advanced';

            default:
                return level;
        }
    };

    const getMuscleGroupName = (path) => {
        if (!path) return '';

        const parts = path.split('/');
        const fileName = parts[parts.length - 1];

        return fileName.replace('ic_', '').replace('.png', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    };

    const getImagePath = (exerciseName) => {
        const baseName = exerciseName.toLowerCase().replace(/\+\d+kg/, 'weighted').replace(/ /g, '_').replace(/-/g, '_').replace(/\./g, '').replace(/°/g, '');
        const withPrefix = `http://192.168.1.57:5003/assets/images_exercises_white/ic_${baseName}_white.png`;

        return withPrefix;
    };

    if (loading && !exercises.length)
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
                <h1 className='text-3xl font-bold text-gray-900'>Exercises</h1>
            </div>

            <div className='flex flex-col md:flex-row gap-4 mb-8'>
                <div className='relative flex-1'>
                    <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4' />
                    <Input
                        placeholder='Search exercises...'
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className='pl-10'
                    />
                </div>

                <div className='flex gap-2'>
                    <Select value={selectedMuscleGroup} onValueChange={setSelectedMuscleGroup}>
                        <SelectTrigger className='w-[180px]'>
                            <SelectValue placeholder='Muscle group' />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value='all'>All groups</SelectItem>
                            {muscleGroups.map((group) => (
                                <SelectItem key={group} value={group}>
                                    {getMuscleGroupName(group)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                        <SelectTrigger className='w-[180px]'>
                            <SelectValue placeholder='Difficulty' />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value='all'>All levels</SelectItem>
                            <SelectItem value='beginner'>Beginner</SelectItem>
                            <SelectItem value='intermediate'>Intermediate</SelectItem>
                            <SelectItem value='advanced'>Advanced</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
                        <SelectTrigger className='w-[180px]'>
                            <SelectValue placeholder='Equipment' />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value='all'>Any</SelectItem>
                            <SelectItem value='none'>No equipment</SelectItem>
                            <SelectItem value='pull-up-bar'>Pull-up bar</SelectItem>
                            <SelectItem value='parallel-bars'>Parallel bars</SelectItem>
                            <SelectItem value='rings'>Rings</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                {exercises.length === 0 ? (
                    <div className='col-span-full'>
                        <Card>
                            <CardContent className='flex flex-col items-center justify-center py-12'>
                                <Target className='h-12 w-12 text-gray-400 mb-4' />
                                <h3 className='text-lg font-medium text-gray-900 mb-2'>Exercises not found</h3>
                                <p className='text-gray-500 text-center'>
                                    Try changing your search parameters
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    exercises.map((exercise) => (
                        <Card 
                            key={exercise.id} 
                            id={`exercise-${exercise.id}`}
                            className='hover:shadow-md transition-shadow cursor-pointer'
                            onClick={() => toggleCardExpansion(exercise.id)}
                        >
                            <CardHeader>
                                <div className='flex justify-between items-start'>
                                    <CardTitle className='text-lg'>{exercise.name}</CardTitle>
                                    <img 
                                        src={getImagePath(exercise.name)} 
                                        alt={exercise.name} 
                                        className='w-24 h-24 grayscale brightness-0 object-cover rounded-md'
                                        onError={(e) => e.target.src = ''}
                                    />
                                    <Badge className={getDifficultyColor(exercise.difficulty_level)}>
                                        {getDifficultyText(exercise.difficulty_level)}
                                    </Badge>
                                </div>

                                <div className='flex gap-2'>
                                    {exercise.muscle_groups && exercise.muscle_groups.length > 0 && (
                                        <Badge variant='outline' className='text-xs'>
                                            {getMuscleGroupName(exercise.muscle_groups[0])}
                                        </Badge>
                                    )}
                                    {exercise.equipment && exercise.equipment !== 'none' && (
                                        <Badge variant='secondary' className='text-xs'>
                                            {exercise.equipment}
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>

                            {expandedCards[exercise.id] && (
                                <CardContent>
                                    <div className='mb-4'>
                                        <h4 className='text-sm font-semibold text-gray-800 mb-2 flex items-center'>
                                            <Target className='h-4 w-4 mr-1' />
                                            Description:
                                        </h4>
                                        <div className='bg-gray-50 rounded-lg p-3'>
                                            <MarkdownRenderer 
                                                content={exercise.description} 
                                                className='mb-4'
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className='mb-4'>
                                        <h4 className='text-sm font-semibold text-gray-800 mb-2 flex items-center'>
                                            <Target className='h-4 w-4 mr-1' />
                                            Instructions:
                                        </h4>
                                        <div className='bg-gray-50 rounded-lg p-3'>
                                            <MarkdownRenderer 
                                                content={exercise.instructions} 
                                                className='mb-4'
                                            />
                                        </div>
                                    </div>

                                    {exercise.muscle_groups && exercise.muscle_groups.length > 1 && (
                                        <div className='mb-4'>
                                            <h4 className='text-sm font-semibold text-gray-800 mb-2'>Target Muscles:</h4>
                                            <div className='flex flex-wrap gap-1'>
                                                {parseJsonArray(exercise.muscle_groups).map((muscle, index) => (
                                                    <Badge key={index} variant='outline' className='text-xs'>
                                                        {getMuscleGroupName(muscle)}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <Button
                                        size='sm'
                                        variant='outline'
                                        className='flex-1'
                                        onClick={() => updateExerciseProgress(exercise.id, 1)}
                                    >
                                        <Zap className='h-4 w-4 mr-1' />
                                        Mark as Done
                                    </Button>
                                </CardContent>
                            )}
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

            {exercises.length > 0 && (
                <div className='mt-4 text-center'>
                    <p className='text-gray-500 text-sm'>
                        Showing {exercises.length} of {pagination?.totalItems || 0} exercises
                    </p>
                </div>
            )}
        </div>
    );
};

export default Exercises;
