import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import Solution from './Solution'
import './Solutions.scss'

function fetchSolutions() {
  return axios.get(`${import.meta.env.BASE_URL}solutions.json`)
}

export type Stack = 'HTML' | 'CSS' | 'JS'

export interface SolutionData {
  title: string
  description: string
  stacks: Stack[]
  previewImage: string
  challengeLink: string
  solutionLink: string
  repoLink: string
  liveLink: string
}

export interface SolutionsData {
  [id: string]: SolutionData
}

export interface SolutionsProps {
  
}

export default function Solutions({}: SolutionsProps) {
  
  const { isPending, error, data } = useQuery({
    queryKey: ['solutions'],
    queryFn: fetchSolutions,
    staleTime: Infinity,
  })
  
  if (isPending) return 'Loading...'
  
  if (error) return `An error has occurred: ${error.message}`
  
  const solutions: SolutionsData = data.data
  
  return (
    <div className="Solutions">
      {Object.entries(solutions).map(([id, solution]) => (
        <Solution key={id} data={solution}/>
      ))}
    </div>
  )
}
