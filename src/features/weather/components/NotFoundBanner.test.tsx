import { render, screen } from '@testing-library/react'
import { NotFoundBanner } from './NotFoundBanner'

describe('NotFoundBanner', () => {
  it('renders as an alert with visible "not found" text', () => {
    render(<NotFoundBanner />)

    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveTextContent(/not found/i)
  })
})
