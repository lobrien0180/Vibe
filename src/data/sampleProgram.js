import workoutTestPhaseCsv from '../../Workout_Test_2.csv?raw'
import { parseWorkoutCsv } from './workoutCsv'

export const sampleProgram = parseWorkoutCsv(workoutTestPhaseCsv, {
  activePhaseNumber: 1,
  fileName: 'Workout_Test_2.csv',
  programName: 'Workout Test 2 Preview',
})
