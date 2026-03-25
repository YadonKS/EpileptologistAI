import React from 'react'
import { Button, Input, Card, Dialog } from '../components/ui'

export default function Example(){
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">UI Component Examples</h1>

      <Card>
        <p>Buttons</p>
        <div className="mt-3 flex gap-3">
          <Button>Primary</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
      </Card>

      <Card>
        <p>Inputs</p>
        <Input placeholder="Type here" />
      </Card>

      <Card>
        <Dialog triggerText="Open dialog">
          <p>This is a dialog content example.</p>
        </Dialog>
      </Card>
    </div>
  )
}
