import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import api from '../lib/api';

const Progressions = () => {
  const [progressions, setProgressions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgressions = async () => {
      try {
        const response = await api.get('/progressions');

        setProgressions(response.data);
      } catch (error) {
        console.error('Failed to fetch progressions', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProgressions();
  }, []);

  if (loading) return <div>Loading...</div>

  return (
    <div className='container mx-auto px-4 py-8'>
      <h1 className='text-3xl font-bold text-gray-900 mb-8'>Progressions</h1>
      <Accordion type='single' collapsible className='w-full'>
        {progressions.map((progression, index) => (
          <AccordionItem value={`item-${index}`} key={progression.id}>
            <AccordionTrigger>{progression.name}</AccordionTrigger>
            <AccordionContent>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                {progression.progressions.map((level, levelIndex) => (
                  <Card key={levelIndex}>
                    <CardHeader>
                        <CardTitle>Level {level.level}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul>
                        {level.exercises.map((exercise, exIndex) => (
                          <li key={exIndex}>{exercise}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};

export default Progressions;
