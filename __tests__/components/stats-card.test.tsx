import { renderWithProviders, screen } from '../../__tests__/utils'
import StatsCard from '@/components/dashboard/stats-card'
import { Users } from 'lucide-react'

describe('StatsCard', () => {
  it('renders title and value', () => {
    renderWithProviders(<StatsCard title="Test Title" value={42} icon={Users} iconColor="#3b82f6" />)
    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })
})
