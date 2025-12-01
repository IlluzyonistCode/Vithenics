import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { onboardingAPI, authAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';
import { ArrowRight, ArrowLeft, Target, CheckCircle } from 'lucide-react';

const Onboarding = () => {
  const navigate = useNavigate();
  const { updateOnboardingStatus, updateUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fitnessLevel: '',
    fitnessGoals: [],
    preferredFocus: '',
    availableEquipment: [],
    workoutFrequency: ''
  });
  const [recommendations, setRecommendations] = useState(null);

  const totalSteps = 5;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const response = await onboardingAPI.complete(formData);
      setRecommendations(response.data.recommendations);
      
      try {
        const verifyResponse = await authAPI.verify();
        const updatedUser = verifyResponse.data.user;
        updateUser(updatedUser);
      } catch (verifyError) {
        console.error('Failed to verify user after onboarding:', verifyError);
        updateOnboardingStatus(true);
      }
      
      setCurrentStep(6);
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      toast.error('Failed to complete onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    navigate('/dashboard');
  };

  const handleGoToSkill = () => {
    if (recommendations?.skill) {
      navigate('/skills');
    }
  };

  const handleGoToWorkout = () => {
    if (recommendations?.workout) {
      navigate('/workouts');
    }
  };

  const handleStart = () => {
    navigate('/dashboard');
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className='space-y-6'>
            <div className='text-center'>
              <h2 className='text-2xl font-bold text-gray-900 mb-2'>Welcome to Vithenics!</h2>
              <p className='text-gray-600'>Let's find the perfect starting point for your fitness journey</p>
            </div>
            <div className='space-y-4'>
              <Label className='text-lg font-semibold'>What's your current fitness level?</Label>
              <RadioGroup
                value={formData.fitnessLevel}
                onValueChange={(value) => setFormData({ ...formData, fitnessLevel: value })}
              >
                <div className='flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer'>
                  <RadioGroupItem value='beginner' id='beginner' />
                  <Label htmlFor='beginner' className='flex-1 cursor-pointer'>
                    <div className='font-medium'>Beginner</div>
                    <div className='text-sm text-gray-500'>New to calisthenics or fitness in general</div>
                  </Label>
                </div>
                <div className='flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer'>
                  <RadioGroupItem value='intermediate' id='intermediate' />
                  <Label htmlFor='intermediate' className='flex-1 cursor-pointer'>
                    <div className='font-medium'>Intermediate</div>
                    <div className='text-sm text-gray-500'>Some experience with bodyweight exercises</div>
                  </Label>
                </div>
                <div className='flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer'>
                  <RadioGroupItem value='advanced' id='advanced' />
                  <Label htmlFor='advanced' className='flex-1 cursor-pointer'>
                    <div className='font-medium'>Advanced</div>
                    <div className='text-sm text-gray-500'>Experienced with calisthenics and advanced moves</div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        );

      case 2:
        return (
          <div className='space-y-6'>
            <div className='text-center'>
              <h2 className='text-2xl font-bold text-gray-900 mb-2'>What are your fitness goals?</h2>
              <p className='text-gray-600'>Select all that apply</p>
            </div>
            <div className='space-y-3'>
              {[
                { value: 'strength', label: 'Build Strength', desc: 'Increase overall body strength' },
                { value: 'flexibility', label: 'Improve Flexibility', desc: 'Enhance mobility and range of motion' },
                { value: 'endurance', label: 'Build Endurance', desc: 'Improve cardiovascular fitness' },
                { value: 'muscle', label: 'Build Muscle', desc: 'Gain muscle mass and definition' },
                { value: 'skills', label: 'Learn Skills', desc: 'Master advanced calisthenics moves' }
              ].map((goal) => (
                <div key={goal.value} className='flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50'>
                  <Checkbox
                    id={goal.value}
                    checked={formData.fitnessGoals.includes(goal.value)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFormData({
                          ...formData,
                          fitnessGoals: [...formData.fitnessGoals, goal.value]
                        });
                      } else {
                        setFormData({
                          ...formData,
                          fitnessGoals: formData.fitnessGoals.filter(g => g !== goal.value)
                        });
                      }
                    }}
                  />
                  <Label htmlFor={goal.value} className='flex-1 cursor-pointer'>
                    <div className='font-medium'>{goal.label}</div>
                    <div className='text-sm text-gray-500'>{goal.desc}</div>
                  </Label>
                </div>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className='space-y-6'>
            <div className='text-center'>
              <h2 className='text-2xl font-bold text-gray-900 mb-2'>What would you like to focus on?</h2>
              <p className='text-gray-600'>Choose your primary area of interest</p>
            </div>
            <RadioGroup
              value={formData.preferredFocus}
              onValueChange={(value) => setFormData({ ...formData, preferredFocus: value })}
            >
              <div className='grid grid-cols-2 gap-4'>
                {[
                  { value: 'upper', label: 'Upper Body', desc: 'Arms, chest, back' },
                  { value: 'lower', label: 'Lower Body', desc: 'Legs, glutes' },
                  { value: 'core', label: 'Core', desc: 'Abs, stability' },
                  { value: 'full', label: 'Full Body', desc: 'Complete workout' },
                  { value: 'flexibility', label: 'Flexibility', desc: 'Mobility, stretching' },
                  { value: 'strength', label: 'Strength', desc: 'Overall power' }
                ].map((focus) => (
                  <div key={focus.value} className='flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer'>
                    <RadioGroupItem value={focus.value} id={focus.value} />
                    <Label htmlFor={focus.value} className='flex-1 cursor-pointer'>
                      <div className='font-medium'>{focus.label}</div>
                      <div className='text-xs text-gray-500'>{focus.desc}</div>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>
        );

      case 4:
        return (
          <div className='space-y-6'>
            <div className='text-center'>
              <h2 className='text-2xl font-bold text-gray-900 mb-2'>What equipment do you have?</h2>
              <p className='text-gray-600'>Select all available equipment</p>
            </div>
            <div className='space-y-3'>
              {[
                { value: 'none', label: 'No Equipment', desc: 'Bodyweight only' },
                { value: 'pull-up-bar', label: 'Pull-up Bar', desc: 'Bar for pull exercises' },
                { value: 'parallel-bars', label: 'Parallel Bars', desc: 'Dips and support holds' },
                { value: 'rings', label: 'Rings', desc: 'Gymnastic rings' }
              ].map((equipment) => (
                <div key={equipment.value} className='flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50'>
                  <Checkbox
                    id={equipment.value}
                    checked={formData.availableEquipment.includes(equipment.value)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setFormData({
                          ...formData,
                          availableEquipment: [...formData.availableEquipment, equipment.value]
                        });
                      } else {
                        setFormData({
                          ...formData,
                          availableEquipment: formData.availableEquipment.filter(e => e !== equipment.value)
                        });
                      }
                    }}
                  />
                  <Label htmlFor={equipment.value} className='flex-1 cursor-pointer'>
                    <div className='font-medium'>{equipment.label}</div>
                    <div className='text-sm text-gray-500'>{equipment.desc}</div>
                  </Label>
                </div>
              ))}
            </div>
          </div>
        );

      case 5:
        return (
          <div className='space-y-6'>
            <div className='text-center'>
              <h2 className='text-2xl font-bold text-gray-900 mb-2'>How often do you want to work out?</h2>
              <p className='text-gray-600'>Choose your preferred workout frequency</p>
            </div>
            <RadioGroup
              value={formData.workoutFrequency}
              onValueChange={(value) => setFormData({ ...formData, workoutFrequency: value })}
            >
              {[
                { value: 'daily', label: 'Daily', desc: 'Every day' },
                { value: '3-4', label: '3-4 times per week', desc: 'Regular schedule' },
                { value: '2-3', label: '2-3 times per week', desc: 'Moderate frequency' },
                { value: '1-2', label: '1-2 times per week', desc: 'Light schedule' },
                { value: 'occasional', label: 'Occasionally', desc: 'When I feel like it' }
              ].map((frequency) => (
                <div key={frequency.value} className='flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer'>
                  <RadioGroupItem value={frequency.value} id={frequency.value} />
                  <Label htmlFor={frequency.value} className='flex-1 cursor-pointer'>
                    <div className='font-medium'>{frequency.label}</div>
                    <div className='text-sm text-gray-500'>{frequency.desc}</div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case 6:
        return (
          <div className='space-y-6'>
            <div className='text-center'>
              <div className='mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4'>
                <CheckCircle className='h-8 w-8 text-green-600' />
              </div>
              <h2 className='text-2xl font-bold text-gray-900 mb-2'>Perfect! Here are our recommendations</h2>
              <p className='text-gray-600'>Based on your answers, we've selected the best starting point for you</p>
            </div>

            {recommendations?.skill && (
              <Card className='border-2 border-blue-200'>
                <CardHeader>
                  <CardTitle className='flex items-center'>
                    <Target className='h-5 w-5 mr-2 text-blue-600' />
                    Recommended Skill
                  </CardTitle>
                  <CardDescription>Start your journey with this skill</CardDescription>
                </CardHeader>
                <CardContent>
                  <h3 className='text-xl font-bold mb-2'>{recommendations.skill.name}</h3>
                  <p className='text-gray-600 mb-4'>{recommendations.skill.description || 'A great starting point for your fitness journey'}</p>
                  <Button onClick={handleGoToSkill} className='w-full'>
                    Go to Skills <ArrowRight className='h-4 w-4 ml-2' />
                  </Button>
                </CardContent>
              </Card>
            )}

            {recommendations?.workout && (
              <Card>
                <CardHeader>
                  <CardTitle>Recommended Workout</CardTitle>
                  <CardDescription>Try this workout routine</CardDescription>
                </CardHeader>
                <CardContent>
                  <h3 className='text-xl font-bold mb-2'>{recommendations.workout.name}</h3>
                  <p className='text-gray-600 mb-4'>{recommendations.workout.description || 'A perfect workout to get started'}</p>
                  <Button onClick={handleGoToWorkout} variant='outline' className='w-full'>
                    Go to Workouts <ArrowRight className='h-4 w-4 ml-2' />
                  </Button>
                </CardContent>
              </Card>
            )}

            <Button onClick={handleStart} className='w-full'>
              Start Exploring
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.fitnessLevel !== '';
      case 2:
        return formData.fitnessGoals.length > 0;
      case 3:
        return formData.preferredFocus !== '';
      case 4:
        return true;
      case 5:
        return formData.workoutFrequency !== '';
      default:
        return false;
    }
  };

  return (
    <div className='min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8'>
      <div className='max-w-2xl w-full'>
        <Card>
          <CardHeader>
            <div className='flex items-center justify-between mb-4'>
              <CardTitle>Getting Started</CardTitle>
              {currentStep <= totalSteps && (
                <span className='text-sm text-gray-500'>
                  Step {currentStep} of {totalSteps}
                </span>
              )}
            </div>
            {currentStep <= totalSteps && (
              <div className='w-full bg-gray-200 rounded-full h-2'>
                <div
                  className='bg-black h-2 rounded-full transition-all duration-300'
                  style={{ width: `${Math.min((currentStep / totalSteps) * 100, 100)}%` }}
                />
              </div>
            )}
          </CardHeader>
          <CardContent className='space-y-6'>
            {renderStep()}

            {currentStep < 6 && (
              <div className='flex justify-between pt-4'>
                <Button
                  variant='outline'
                  onClick={currentStep === 1 ? handleSkip : handleBack}
                  disabled={loading}
                >
                  {currentStep === 1 ? 'Skip' : (
                    <>
                      <ArrowLeft className='h-4 w-4 mr-2' />
                      Back
                    </>
                  )}
                </Button>
                {currentStep === totalSteps ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={!canProceed() || loading}
                  >
                    {loading ? (
                      <>
                        <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2'></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        Complete <ArrowRight className='h-4 w-4 ml-2' />
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleNext}
                    disabled={!canProceed()}
                  >
                    Next <ArrowRight className='h-4 w-4 ml-2' />
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;

