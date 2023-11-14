import type { SolutionData } from "./Solutions"
import './Solution.scss'

export interface SolutionProps {
  data: SolutionData
}

export default function Solution({ data }: SolutionProps) {
  
  let {
    title,
    description,
    stacks,
    previewImage,
    challengeLink,
    solutionLink,
    repoLink,
    liveLink,
  } = data
  
  const { pathname } = new URL(liveLink)
  if (pathname.startsWith(import.meta.env.BASE_URL)) {
    // TODO: Configure dev server to accept paths without trailing slash
    liveLink = pathname.endsWith('/') ? pathname : `${pathname}/`
  }
  
  return (
    <div className="Solution">
      <div className="Solution_Preview">
        <img
          className="Solution_Image"
          src={previewImage}
          alt="Preview Image"
        />
      </div>
      <div className="Solution_Info">
        <h3 className="Solution_Title">{title}</h3>
        
        <div className="Solution_Stacks">
          {stacks.map(stack =>
            <div key={stack} className={`Solution_Stack Solution_Stack-${stack.toLowerCase()}`}>{stack}</div>
          )}
        </div>
        
        <p className="Solution_Description">{description}</p>
        
        <div className="Solution_Links">
          <div className="Solution_LinkGroup">
            <a className="Solution_Link" href={solutionLink} target="_blank">Solution</a>
            <a className="Solution_Link" href={challengeLink} target="_blank">Try Out</a>
          </div>
          <div className="Solution_LinkGroup">
            <a className="Solution_Link" href={repoLink} target="_blank">Repo</a>
            <a className="Solution_Link" href={liveLink} target="_blank">Live</a>
          </div>
        </div>
        
      </div>
    </div>
  )
}
