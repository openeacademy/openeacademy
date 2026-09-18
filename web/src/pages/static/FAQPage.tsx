export default function FAQPage() {
  const faqs = [
    {
      question: "What is Open E Academy?",
      answer: "Open E Academy is a comprehensive online learning platform designed to help aspirants prepare for competitive government examinations in India, such as SSC, UPSC, Banking, and Railways. We provide study materials, mock tests, and a vast PDF library."
    },
    {
      question: "How do I access the PDF library?",
      answer: "You can browse our PDF library for free. Some PDFs are completely free to read, while others offer a limited free preview. To read premium PDFs in full, you need an active subscription."
    },
    {
      question: "Can I download the PDFs?",
      answer: "To protect our content from piracy, PDFs can only be read within our platform's secure PDF viewer. They cannot be downloaded or printed."
    },
    {
      question: "How do subscriptions work?",
      answer: "We offer monthly, quarterly, and yearly subscription plans. Once subscribed, you get unlimited access to all premium PDFs, mock tests, and quizzes on our platform for the duration of your plan."
    },
    {
      question: "Is there a mobile app available?",
      answer: "Yes! Open E Academy is available on both web and Android. You can use the same account to log in across both platforms, and your progress and bookmarks will sync automatically."
    },
    {
      question: "How can I contact support?",
      answer: "You can reach out to our support team at support@openeacademy.in. We typically respond within 24 hours."
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">Frequently Asked Questions</h1>
      
      <div className="space-y-6 mt-12">
        {faqs.map((faq, index) => (
          <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">{faq.question}</h3>
            <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
          </div>
        ))}
      </div>
      
      <div className="mt-16 text-center bg-primary-50 rounded-2xl p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Still have questions?</h2>
        <p className="text-gray-600 mb-6">Can't find the answer you're looking for? Please chat to our friendly team.</p>
        <a href="/contact" className="btn-primary inline-flex">Contact Support</a>
      </div>
    </div>
  );
}
