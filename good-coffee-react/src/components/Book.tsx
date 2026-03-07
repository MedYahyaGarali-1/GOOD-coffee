import { useState, type FormEvent } from 'react';

export default function Book() {
  const [formData, setFormData] = useState({ name: '', email: '', number: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    // In a real app, this would send data to the server
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
    setFormData({ name: '', email: '', number: '', message: '' });
  };

  return (
    <section className="book" id="book">
      <h1 className="heading">booking <span>reserve a table</span></h1>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Name"
          className="box"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
        <input
          type="email"
          placeholder="Email"
          className="box"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
        <input
          type="number"
          placeholder="Number"
          className="box"
          value={formData.number}
          onChange={(e) => setFormData({ ...formData, number: e.target.value })}
          required
        />
        <textarea
          placeholder="Message"
          className="box"
          cols={30}
          rows={10}
          value={formData.message}
          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
        />
        <input
          type="submit"
          value={submitted ? '✓ Message Sent!' : 'send message'}
          className="btn"
        />
      </form>
    </section>
  );
}
