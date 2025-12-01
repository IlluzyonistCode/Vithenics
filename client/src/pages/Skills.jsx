import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import api from '../lib/api';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { toast } from 'sonner';

const Skills = () => {
    const navigate = useNavigate();
    const [skills, setSkills] = useState([]);
    const [categories, setCategories] = useState([]);
    const [userProgress, setUserProgress] = useState({});
    const [loading, setLoading] = useState(true);
    const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState(false);
    const [currentSkill, setCurrentSkill] = useState(null);
    const [currentProgression, setCurrentProgression] = useState(null);
    const [workoutInput, setWorkoutInput] = useState({
        sets: '',
        repetitions: '',
        seconds: ''
    });
    const [exercises, setExercises] = useState([]);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);

            await Promise.all([
                fetchSkills(),
                fetchUserProgress(),
                fetchExercises()
            ]);

            setLoading(false);
        };

        loadData();
    }, []);

    const fetchExercises = async () => {
        try {
            let allExercises = [];
            let page = 1;
            let hasMore = true;
            
            while (hasMore) {
                const response = await api.get(`/exercises?page=${page}&limit=100`);
                const exercises = response.data.exercises || [];
                allExercises = [...allExercises, ...exercises];
                
                if (exercises.length < 100 || page * 100 >= response.data.pagination?.totalItems) {
                    hasMore = false;
                } else {
                    page++;
                }
            }
            
            setExercises(allExercises);
        } catch (error) {
            console.error('Failed to fetch exercises:', error);
        }
    };

    const findExerciseByName = (exerciseName) => {
        if (!exerciseName || !exercises.length) return null;
        
        const normalizedSearch = exerciseName.toLowerCase().trim();
        
        let exercise = exercises.find(ex => 
            ex.name.toLowerCase().trim() === normalizedSearch
        );
        
        if (!exercise) {
            exercise = exercises.find(ex => {
                const normalizedEx = ex.name.toLowerCase().trim();
                return normalizedEx.includes(normalizedSearch) || normalizedSearch.includes(normalizedEx);
            });
        }
        
        if (!exercise) {
            const cleanSearch = normalizedSearch.replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
            exercise = exercises.find(ex => {
                const cleanEx = ex.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
                return cleanEx.includes(cleanSearch) || cleanSearch.includes(cleanEx);
            });
        }
        
        return exercise;
    };

    const handleExerciseClick = (e, exerciseName) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!exercises.length) {
            toast.error('Exercises are still loading. Please try again in a moment.');
            return;
        }
        
        const exercise = findExerciseByName(exerciseName);
        if (exercise) {
            navigate(`/exercises?highlight=${exercise.id}`);
        } else {
            navigate(`/exercises?search=${encodeURIComponent(exerciseName)}`);
        }
    };

    const fetchSkills = async () => {
        try {
            const response = await api.get('/skills');

            setSkills(response.data.skills);
        } catch (error) {
            console.error('Failed to fetch skills', error);

            toast.error('Could not load skills. Please try again later.');
        }
    };

    const fetchUserProgress = async () => {
        try {
            const response = await api.get('/skills/user/progress');

            if (response.data && typeof response.data.progress === 'object')  {
                const formattedProgress = {};

                for (const skillId in response.data.progress) {
                    const progressData = response.data.progress[skillId];

                    formattedProgress[skillId] = {
                        current_level: progressData.current_level,
                        personal_best: typeof progressData.personal_best === 'string' 
                            ? JSON.parse(progressData.personal_best || '{}')
                            : progressData.personal_best || {}
                    };
                }

                setUserProgress(formattedProgress);
            }
        } catch (error) {
            console.error('Failed to fetch user progress:', error);
        }
    };

    const handleStartWorkout = (skill, progression) => {
        setCurrentSkill(skill);
        setCurrentProgression(progression);
        setWorkoutInput({
            sets: '',
            repetitions: '',
            seconds: ''
        });
        
        if (progression.goal && progression.goal > 30)
            setCurrentProgression({ ...progression, goalType: 'seconds' });
        
        else if (progression.goal && progression.goal <= 30)
            setCurrentProgression({ ...progression, goalType: 'repetitions' });
        
        else
            setCurrentProgression({ ...progression, goalType: 'none' });

        setIsWorkoutModalOpen(true);
    };

    const handleRecordWorkout = async () => {
        if (!currentSkill || !currentProgression) return;

        try {
            let exercisesCompleted = [];

            if (currentProgression?.plan)
                exercisesCompleted = currentProgression.plan.map((exercise, index) => ({
                    exerciseId: index,
                    name: exercise.name,
                    sets: exercise.set,
                    reps: exercise.beat,
                    completed: true
                }));

            const workoutData = {
                workoutName: `${currentSkill.name} - ${currentProgression.name}`,
                exercisesCompleted: exercisesCompleted,
                duration_minutes: 20, 
                notes: `Skill progression workout for ${currentSkill.name}`
            };

            await api.post('/history/workouts', workoutData);

            const currentProgress = userProgress[currentSkill.id] || { current_level: 1, personal_best: {} };
            const currentPersonalBest = currentProgress.personal_best || {};
            
            // Get input values
            const inputSets = parseInt(workoutInput.sets) || 0;
            const inputRepetitions = parseInt(workoutInput.repetitions) || 0;
            const inputSeconds = parseInt(workoutInput.seconds) || 0;
            
            const updatedPersonalBest = {
                sets: Math.max(currentPersonalBest.sets || 0, inputSets),
                repetitions: Math.max(currentPersonalBest.repetitions || 0, inputRepetitions),
                seconds: Math.max(currentPersonalBest.seconds || 0, inputSeconds)
            };

            let newLevel = currentProgress.current_level;
            const currentGoal = currentProgression.goal || 0;
            const currentLevel = currentProgression.level || 1;
            
            if (currentLevel <= currentProgress.current_level + 1) {
                let goalAchieved = false;
                
                if (currentProgression.goalType === 'repetitions' && inputRepetitions >= currentGoal) {
                    goalAchieved = true;
                } else if (currentProgression.goalType === 'seconds' && inputSeconds >= currentGoal) {
                    goalAchieved = true;
                } else if (currentProgression.goalType === 'sets' && inputSets >= currentGoal) {
                    goalAchieved = true;
                } else if (currentProgression.goalType === 'none' || !currentGoal) {
                    goalAchieved = true;
                }
                
                if (goalAchieved && currentLevel === currentProgress.current_level) {
                    newLevel = currentLevel + 1;
                } else if (goalAchieved && currentLevel < currentProgress.current_level) {
                    newLevel = currentProgress.current_level;
                } else {
                    newLevel = currentProgress.current_level;
                }
            } else {
                newLevel = currentProgress.current_level;
            }
            
            const progressUpdate = {
                skill_id: currentSkill.id,
                current_level: newLevel,
                sets: inputSets,
                repetitions: inputRepetitions,
                seconds: inputSeconds,
                personal_best: updatedPersonalBest
            };

            await api.post('/skills/user/progress', progressUpdate);

            setUserProgress(prev => ({
                ...prev,
                [currentSkill.id]: {
                    current_level: newLevel,
                    personal_best: updatedPersonalBest
                }
            }));
            
            toast.success(`Workout for '${currentProgression.name}' recorded!`);

            setIsWorkoutModalOpen(false);
        } catch (error) {
            console.error('Failed to record workout or update progress:', error);

            toast.error('Failed to record your workout. Please try again.');
        }
    };
    
    const calculateProgressPercentage = (skillId, progression) => {
        const progress = userProgress[skillId];
        const userLevel = progress ? progress.current_level : 1; 

        let goalType = progression.goalType;

        if (!goalType) {
            if (progression.goal && progression.goal > 30) goalType = 'seconds';
            
            else if (progression.goal && progression.goal <= 30) goalType = 'repetitions';
            
            else goalType = 'none';
        }
        
        let userProgressValue = 0;

        if (goalType === 'repetitions')
            userProgressValue = progress?.personal_best?.repetitions || 0;
        
        else if (goalType === 'seconds') 
            userProgressValue = progress?.personal_best?.seconds || 0;
        
        else
            userProgressValue = progress?.personal_best?.sets || 0;

        if (progression.level < userLevel) return 100;

        if (progression.level === userLevel) {
            const targetGoal = progression.goal || 0;

            if (targetGoal > 0)
                return Math.min(Math.round((userProgressValue / targetGoal) * 100), 100);
        }

        return 0;
    };

    const getImagePath = (skillName) => {
        const baseName = skillName.toLowerCase().replace(/ /g, '_').replace(/-/g, '_');
        const withPrefix = `http://192.168.1.57:5003/assets/images_exercise/ic_${baseName}.png`;

        return withPrefix;
    };

    const isProgressionLocked = (skillId, progressionLevel) => {
        const progress = userProgress[skillId];
        const userLevel = progress ? progress.current_level : 1; 

        if (progressionLevel === 1) return false;

        if (progressionLevel === userLevel + 1) {
            const skill = skills.find(s => s.id === skillId);

            if (!skill || !skill.progressions) return true;
            
            const previousProgression = skill.progressions.find(p => p.level === userLevel);

            if (!previousProgression) return true;
            
            const progressPercentage = calculateProgressPercentage(skillId, previousProgression);

            return progressPercentage < 100;
        }

        return progressionLevel > userLevel + 1;
    };

    if (loading)
        return <div className='text-center p-10'>Loading skills...</div>;

    return (
        <div className='container mx-auto px-4 py-8'>
            <div className='flex justify-between items-center mb-8'>
                <h1 className='text-3xl font-bold text-gray-900'>Skills</h1>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                {skills.map(skill => {
                    return (
                        <Dialog key={skill.id}>
                            <DialogTrigger asChild>
                                <Card className='flex flex-col cursor-pointer hover:shadow-lg transition-shadow'>
                                    <CardHeader>
                                        <CardTitle>{skill.name}</CardTitle>
                                    </CardHeader>

                                    <CardContent className='flex-grow flex flex-col justify-between'>
                                        <img 
                                            src={getImagePath(skill.name)} 
                                            alt={skill.name} 
                                            className='w-75 grayscale brightness-0 rounded-md mb-4'
                                            onError={(e) => e.target.src = ''}
                                        />

                                        <div className='text-sm text-gray-600 line-clamp-3'>
                                            <MarkdownRenderer content={skill.description || 'No description available.'} />
                                        </div>
                                    </CardContent>
                                </Card>
                            </DialogTrigger>

                            <DialogContent className='sm:max-w-[600px]'>
                                <DialogHeader>
                                    <DialogTitle className='text-2xl'>{skill.name}</DialogTitle>
                                </DialogHeader>

                                <div className='py-4 max-h-[70vh] overflow-y-auto'>
                                    <img 
                                        src={getImagePath(skill.name)} 
                                        alt={skill.name} 
                                        className='w-75 grayscale brightness-0 rounded-md mb-4'
                                        onError={(e) => e.target.src = ''}
                                    />

                                    <MarkdownRenderer content={skill.description || 'No description available.'} />

                                    <h3 className='font-bold mt-4 mb-2'>Progressions</h3>

                                    <Accordion type='single' collapsible className='w-full'>
                                        {skill.progressions && skill.progressions.length > 0 ? skill.progressions.map((prog, index) => {
                                            const locked = isProgressionLocked(skill.id, prog.level);
                                            const progressPercentage = calculateProgressPercentage(skill.id, prog);
                                            const isCurrentLevel = userProgress[skill.id]?.current_level === prog.level;

                                            return (
                                                <AccordionItem value={`item-${index}`} key={index} disabled={locked}>
                                                    <AccordionTrigger className={`no-underline ${locked ? 'text-gray-400 cursor-not-allowed' : ''}`}>
                                                        <div className='flex items-center justify-between w-full pr-4'>
                                                            <span>
                                                                {prog.name} (Level {prog.level})
                                                                {isCurrentLevel && <span className='ml-2 text-blue-500 font-semibold'> (Current)</span>}
                                                            </span>
                                                            {locked && <span className='text-sm text-red-500'>Locked</span>}
                                                        </div>
                                                    </AccordionTrigger>

                                                    <AccordionContent>
                                                        <ul className='list-disc pl-5 text-sm space-y-1 mb-3'>
                                                            {prog.plan && prog.plan.map((ex, exIndex) => (
                                                                <li key={exIndex}>
                                                                    <button
                                                                        onClick={(e) => handleExerciseClick(e, ex.name)}
                                                                        className='font-bold underline hover:no-underline'
                                                                    >
                                                                        {ex.name}
                                                                    </button>
                                                                    : <strong>{ex.set} sets of {ex.beat}</strong>
                                                                </li>
                                                            ))}
                                                        </ul>

                                                        <div className='mt-4'>
                                                            {prog.goal && <p className='text-sm font-semibold'>Goal: {prog.goal} seconds</p>}
                                                            
                                                            <div className='mt-2'>
                                                                <div className='w-full bg-gray-200 rounded-full h-2.5'>
                                                                    <div 
                                                                        className='bg-blue-600 h-2.5 rounded-full' 
                                                                        style={{width: `${progressPercentage}%`}}
                                                                    ></div>
                                                                </div>

                                                                <p className='text-xs text-gray-600 mt-1'>
                                                                    {progressPercentage}% Complete
                                                                </p>
                                                            </div>
                                                        </div>

                                                        <Button 
                                                            size='sm' 
                                                            onClick={() => handleStartWorkout(skill, prog)} 
                                                            disabled={locked} 
                                                            className='mt-4'
                                                        >
                                                            Record Workout
                                                        </Button>
                                                    </AccordionContent>
                                                </AccordionItem>
                                            );
                                        }) : <p className='text-sm text-gray-500'>No progressions available for this skill.</p>}
                                    </Accordion>
                                </div>
                            </DialogContent>
                        </Dialog>
                    );
                })}
            </div>

            <Dialog open={isWorkoutModalOpen} onOpenChange={setIsWorkoutModalOpen}>
                <DialogContent className='sm:max-w-[425px]'>
                    <DialogHeader>
                        <DialogTitle>Record: {currentProgression?.name}</DialogTitle>
                        <DialogDescription>
                            Enter your results for this progression to update your skill level.
                        </DialogDescription>
                    </DialogHeader>

                    <div className='grid gap-4 py-4'>
                        {currentProgression?.goalType === 'sets' && (
                            <div className='grid grid-cols-4 items-center gap-4'>
                                <Label htmlFor='sets' className='text-right'>Sets</Label>
                                <Input
                                    id='sets'
                                    value={workoutInput.sets}
                                    onChange={(e) => setWorkoutInput(prev => ({ ...prev, sets: e.target.value }))}
                                    className='col-span-3'
                                    type='number'
                                    placeholder={`Goal: ${currentProgression?.goal || 'N/A'}`}
                                />
                            </div>
                        )}

                        {currentProgression?.goalType === 'repetitions' && (
                            <div className='grid grid-cols-4 items-center gap-4'>
                                <Label htmlFor='repetitions' className='text-right'>Reps</Label>
                                <Input
                                    id='repetitions'
                                    value={workoutInput.repetitions}
                                    onChange={(e) => setWorkoutInput(prev => ({ ...prev, repetitions: e.target.value }))}
                                    className='col-span-3'
                                    type='number'
                                    placeholder={`Goal: ${currentProgression?.goal || 'N/A'}`}
                                />
                            </div>
                        )}

                        {currentProgression?.goalType === 'seconds' && (
                            <div className='grid grid-cols-4 items-center gap-4'>
                                <Label htmlFor='seconds' className='text-right'>Seconds</Label>
                                <Input
                                    id='seconds'
                                    value={workoutInput.seconds}
                                    onChange={(e) => setWorkoutInput(prev => ({ ...prev, seconds: e.target.value }))}
                                    className='col-span-3'
                                    type='number'
                                    placeholder={`Goal: ${currentProgression?.goal || 'N/A'}`}
                                />
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type='submit' onClick={handleRecordWorkout}>
                            Record Workout
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Skills;
