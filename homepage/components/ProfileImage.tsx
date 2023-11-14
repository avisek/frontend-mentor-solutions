import './ProfileImage.scss'

const api = (size: number) =>
  `https://gravatar.com/avatar/9d883bc240644092077c837aa332093b122734da19c5a7ab619aa0e3608fe952?s=${size}`

export interface ProfileImageProps {
  size: number
}

export default function ProfileImage({ size }: ProfileImageProps) {
  
  return (
    <img className="ProfileImage"
      src={api(size)}
      srcSet={`${api(size)} 1x, ${api(size * 2)} 2x`}
      alt="Profile Image"/>
  )
}
