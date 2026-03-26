type BrandLogoProps = {
  className?: string
  alt?: string
}

export default function BrandLogo({ className = 'h-10 w-10', alt = 'EpileptologistAI logo' }: BrandLogoProps) {
  return <img src="/logo.svg" alt={alt} className={className} />
}
