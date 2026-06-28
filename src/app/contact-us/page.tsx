'use client';

import type React from 'react';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, AlertCircle } from 'lucide-react';

export default function ContactUs() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ firstName, lastName, email, message }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit the form');
      }

      setSuccessMessage(
        'Your message was successfully submitted. We will get back to you soon!'
      );
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='flex min-h-screen flex-col items-center bg-background p-4 pt-16'>
      <main className='w-full max-w-md'>
        <div className='mb-6 text-center'>
          <h1 className='text-3xl font-bold tracking-tight'>Contact Us</h1>
          <p className='mt-2 text-muted-foreground'>
            We would love to hear from you. Fill out the form below.
          </p>
        </div>

        {successMessage ? (
          <Alert className='bg-success/20 border-success text-success'>
            <CheckCircle className='h-4 w-4' />
            <AlertTitle>Success!</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Get in touch</CardTitle>
              <CardDescription>
                Send us a message and we will get back to you as soon as
                possible.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className='space-y-4'>
                <div className='grid grid-cols-2 gap-4'>
                  <div className='space-y-2'>
                    <Label htmlFor='firstName'>First Name</Label>
                    <Input
                      id='firstName'
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      placeholder='John'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='lastName'>Last Name</Label>
                    <Input
                      id='lastName'
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      placeholder='Doe'
                    />
                  </div>
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='email'>Email</Label>
                  <Input
                    type='email'
                    id='email'
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder='john@example.com'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='message'>Message</Label>
                  <Textarea
                    id='message'
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    placeholder='Your message here'
                    className='min-h-[120px]'
                  />
                </div>
                {error && (
                  <Alert variant='destructive'>
                    <AlertCircle className='h-4 w-4' />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  type='submit'
                  className='w-full dark:bg-gray-800'
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit'}
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}
      </main>
    </div>
  );
}
