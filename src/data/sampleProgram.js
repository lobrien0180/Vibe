export const sampleProgram = {
  id: 'program-strength-cycle',
  name: "Lauren's cool app",
  activePhaseId: 'phase-accumulation',
  phases: [
    {
      id: 'phase-accumulation',
      name: 'Accumulation Block',
      weeks: [
        {
          id: 'week-1',
          label: 'Week 1',
          startDate: '2026-04-13',
          workouts: [
            {
              id: 'workout-lower-a',
              dayLabel: 'Monday',
              title: 'Lower Body A',
              status: 'not started',
              durationEstimate: '45 min',
              movements: [
                {
                  id: 'back-squat',
                  title: 'Back Squat',
                  category: 'Primary Lift',
                  coachNote: 'Smooth tempo and consistent depth.',
                  prescription: {
                    sets: 4,
                    reps: '6',
                    tempo: '31X1',
                    rest: '2 min',
                  },
                  previousPerformance: [
                    {
                      id: 'back-squat-history-1',
                      sessionLabel: 'Week 1 · Session Preview',
                      summary: 'Top sets at 80 kg',
                      source: 'Current phase',
                      weights: ['75 kg', '77.5 kg', '80 kg', '80 kg'],
                      notes: 'Last session felt steady. Keep bracing hard out of the hole.',
                    },
                  ],
                },
                {
                  id: 'rdl',
                  title: 'Romanian Deadlift',
                  category: 'Accessory',
                  coachNote: 'Stay long through the hamstrings.',
                  prescription: {
                    sets: 3,
                    reps: '8',
                    tempo: '3111',
                    rest: '90 sec',
                  },
                  previousPerformance: [
                    {
                      id: 'rdl-history-1',
                      sessionLabel: 'Week 1 · Session Preview',
                      summary: 'Working sets at 55 kg',
                      source: 'Current phase',
                      weights: ['50 kg', '52.5 kg', '55 kg'],
                      notes: 'Hamstrings were the limiter. Keep the bar close on the descent.',
                    },
                  ],
                },
              ],
            },
            {
              id: 'workout-upper-a',
              dayLabel: 'Wednesday',
              title: 'Upper Body A',
              status: 'not started',
              durationEstimate: '40 min',
              movements: [
                {
                  id: 'bench-press',
                  title: 'Bench Press',
                  category: 'Primary Lift',
                  coachNote: 'Pause lightly on the chest.',
                  prescription: {
                    sets: 4,
                    reps: '5',
                    tempo: '21X1',
                    rest: '2 min',
                  },
                  previousPerformance: [
                    {
                      id: 'bench-history-1',
                      sessionLabel: 'Week 1 · Session Preview',
                      summary: 'Top sets at 47.5 kg',
                      source: 'Current phase',
                      weights: ['42.5 kg', '45 kg', '47.5 kg', '47.5 kg'],
                      notes: 'Bar path felt solid. Keep shoulders pinned to the bench.',
                    },
                  ],
                },
                {
                  id: 'db-row',
                  title: 'Dumbbell Row',
                  category: 'Accessory',
                  coachNote: 'Drive elbow back and control the lowering.',
                  prescription: {
                    sets: 3,
                    reps: '10 / arm',
                    tempo: '2111',
                    rest: '60 sec',
                  },
                  previousPerformance: [
                    {
                      id: 'db-row-history-1',
                      sessionLabel: 'Week 1 · Session Preview',
                      summary: 'Used 20 kg dumbbells',
                      source: 'Current phase',
                      weights: ['18 kg', '20 kg', '20 kg'],
                      notes: 'Good control. Pause briefly at the top before lowering.',
                    },
                  ],
                },
              ],
            },
            {
              id: 'workout-full-b',
              dayLabel: 'Friday',
              title: 'Full Body B',
              status: 'complete',
              durationEstimate: '50 min',
              movements: [
                {
                  id: 'front-squat',
                  title: 'Front Squat',
                  category: 'Primary Lift',
                  coachNote: 'Stay tall and brace early.',
                  prescription: {
                    sets: 4,
                    reps: '4',
                    tempo: '30X1',
                    rest: '2 min',
                  },
                  previousPerformance: [
                    {
                      id: 'front-squat-history-1',
                      sessionLabel: 'Week 1 · Completed Session',
                      summary: 'Top sets at 70 kg',
                      source: 'Current phase',
                      weights: ['65 kg', '67.5 kg', '70 kg', '70 kg'],
                      notes: 'Best front rack yet. Elbows stayed up throughout.',
                    },
                  ],
                },
                {
                  id: 'pull-up',
                  title: 'Pull-Up',
                  category: 'Bodyweight',
                  coachNote: 'Use a full hang and smooth finish.',
                  prescription: {
                    sets: 3,
                    reps: 'AMRAP',
                    tempo: '20X1',
                    rest: '90 sec',
                  },
                  previousPerformance: [
                    {
                      id: 'pull-up-history-1',
                      sessionLabel: 'Week 1 · Completed Session',
                      summary: 'Bodyweight sets of 9, 8, 7',
                      source: 'Current phase',
                      weights: ['BW x 9', 'BW x 8', 'BW x 7'],
                      notes: 'Grip faded by the third set. Consider longer rest next time.',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
}
