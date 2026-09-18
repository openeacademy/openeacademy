import { MapPin, Mail, Phone } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Contact Us</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        <div>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Have questions about our courses, subscriptions, or platform? We're here to help. Reach out to us through any of the channels below and our support team will get back to you as soon as possible.
          </p>
          
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="bg-primary-50 p-3 rounded-xl text-primary-600">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Email Support</h3>
                <p className="text-gray-600 mt-1">support@openeacademy.in</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="bg-primary-50 p-3 rounded-xl text-primary-600">
                <Phone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Phone</h3>
                <p className="text-gray-600 mt-1">+91 (XX) XXXX-XXXX</p>
                <p className="text-sm text-gray-500 mt-1">Mon-Sat, 9am to 6pm IST</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="bg-primary-50 p-3 rounded-xl text-primary-600">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Office</h3>
                <p className="text-gray-600 mt-1">
                  Open E Academy HQ<br />
                  Tech Park, Block B<br />
                  New Delhi, India 110001
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Send us a message</h2>
          <form className="space-y-4" onSubmit={e => e.preventDefault()}>
            <div>
              <label className="label">Full Name</label>
              <input type="text" className="input" placeholder="Your name" required />
            </div>
            <div>
              <label className="label">Email Address</label>
              <input type="email" className="input" placeholder="your@email.com" required />
            </div>
            <div>
              <label className="label">Message</label>
              <textarea className="input min-h-[120px] resize-y" placeholder="How can we help you?" required></textarea>
            </div>
            <button type="submit" className="btn-primary w-full justify-center">
              Send Message
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
