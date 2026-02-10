import styles from "./figure-avatar.module.css"

interface FigureAvatarProps {
  slug: string
  name: string
  size?: number
}

export default function FigureAvatar({ slug, name, size = 100 }: FigureAvatarProps) {
  return (
    <img
      src={`/avatars/${slug}.jpg`}
      alt={name}
      className={styles.avatar}
      style={{ width: size, height: size }}
    />
  )
}
