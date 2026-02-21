import Image from 'next/image'
import styles from './figure-avatar.module.css'

interface FigureAvatarProps {
  slug: string
  name: string
  size?: number
}

export default function FigureAvatar({ slug, name, size = 100 }: FigureAvatarProps) {
  return (
    <Image
      src={`/avatars/${slug}.jpg`}
      alt={name}
      width={size}
      height={size}
      sizes={`${size}px`}
      className={styles.avatar}
    />
  )
}
