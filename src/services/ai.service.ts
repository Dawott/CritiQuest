import { ChatGroq } from "@langchain/groq";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { Philosopher } from 'src/types/database.types';

export class AIService {
    private groq: ChatGroq;
    constructor() {
        this.groq = new ChatGroq({
            model: "llama-3.3-70b-versatile",
            temperature: 0
        });
    }


async generatePhilosophicalDebate(
    topic: string,
    philosopher1Id: string,
    philosopher2Id: string
  ): Promise<{
    debate: Array<{
      speaker: string;
      argument: string;
      philosophicalBasis: string;
    }>;
    winner?: string;
    insights: string[];
  }> {
    const [phil1, phil2] = await Promise.all([
      this.getPhilosopher(philosopher1Id),
      this.getPhilosopher(philosopher2Id),
    ]);

    const systemPrompt = 'You are a knowledgeable teacher in philosophy and history. You will sometimes play the role of philosophers to entertain your pupils';

    const prompt = `Generate a philosophical debate between ${phil1.name} and ${phil2.name} on the topic: "${topic}".
    Consider their philosophical schools: ${phil1.school} vs ${phil2.school}.
    Format as a structured debate with 3 rounds.`;

    const messages = [
        new SystemMessage(systemPrompt),
        new HumanMessage(prompt)
    ];

    const completion = await model.invoke(messages);

    /*
    const completion = await this.groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
    });*/

    return this.parseDebate(completion.choices[0].message.content);

  };

  /*

  // Spersonalizowane pytania

  async generatePersonalizedQuestions(
    userId: string,
    concepts: string[]
  ): Promise<Array<{
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
    difficulty: number;
  }>> {
    const userProgress = await this.getUserProgress(userId);
    
    const prompt = `Create philosophical questions about ${concepts.join(', ')} 
    for a student at level ${userProgress.level}. 
    Focus on ${userProgress.weakAreas.join(', ')}.`;

    const systemPrompt = 'You are a knowledgeable teacher in philosophy and history. You will sometimes play the role of philosophers to entertain your pupils'

    return this.generateQuestions(prompt);
  }

 //Ocena esejów
  async evaluatePhilosophicalEssay(
    essay: string,
    topic: string,
    rubric: string[]
  ): Promise<{
    score: number;
    feedback: string[];
    strengths: string[];
    improvements: string[];
    philosophicalAccuracy: number;
  }> {
    const evaluation = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [{
        role: "system",
        content: "You are a philosophy professor evaluating student essays.",
      }, {
        role: "user",
        content: `Evaluate this essay on "${topic}" using these criteria: ${rubric.join(', ')}\n\nEssay: ${essay}`,
      }],
    });

    return this.parseEvaluation(evaluation.choices[0].message.content);
  }
*/

}